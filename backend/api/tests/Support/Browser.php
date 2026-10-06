<?php

namespace Tests\Support;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;

/** An HTTP client with a cookie jar, for the tests that depend on a session. */
final class Browser
{
    /** @var array<string, string> */
    private array $cookies = [];

    private ?int $signedInId = null;

    private ?string $accountHeader = null;

    private bool $withoutAccountHeader = false;

    private string $ip = '127.0.0.1';

    private bool $acceptsJson = true;

    /** @var array<string, string> */
    private array $extraServerVars = [];

    private function __construct(private readonly TestCase $test) {}

    public static function for(TestCase $test): self
    {
        return new self($test);
    }

    public function useDatabaseDrivers(): self
    {
        config(['session.driver' => 'database', 'cache.default' => 'database']);
        Cache::purge();

        return $this;
    }

    public function enforceCsrf(): self
    {
        app()['env'] = 'local';

        return $this;
    }

    public function fromIp(string $ip): self
    {
        $this->ip = $ip;

        return $this;
    }

    public function signedInAs(User $user): self
    {
        $this->signedInId = $user->id;

        return $this;
    }

    public function withAccountHeader(?string $value): self
    {
        $this->accountHeader = $value;

        return $this;
    }

    public function withoutAccountHeader(): self
    {
        $this->withoutAccountHeader = true;

        return $this;
    }

    public function withHeader(string $name, string $value): self
    {
        $this->extraServerVars['HTTP_'.strtoupper(str_replace('-', '_', $name))] = $value;

        return $this;
    }

    public function withoutAccept(): self
    {
        $this->acceptsJson = false;

        return $this;
    }

    public function cookie(string $name): ?string
    {
        return $this->cookies[$name] ?? null;
    }

    public function cookieStartingWith(string $prefix): ?string
    {
        foreach ($this->cookies as $name => $value) {
            if (str_starts_with($name, $prefix)) {
                return $value;
            }
        }

        return null;
    }

    public function withCookie(string $name, string $value): self
    {
        $this->cookies[$name] = $value;

        return $this;
    }

    public function forget(string $name): self
    {
        unset($this->cookies[$name]);

        return $this;
    }

    public function get(string $uri): TestResponse
    {
        return $this->send('GET', $uri);
    }

    /** @param array<string, mixed> $data */
    public function post(string $uri, array $data = []): TestResponse
    {
        return $this->send('POST', $uri, $data);
    }

    /** Starts a session for the user through a test-only route and makes the following requests carry the account header. */
    public function signIn(User $user, bool $remember = false): self
    {
        self::registerSignInRoute();
        $this->post('/api/_browser/sign-in', ['id' => $user->id, 'remember' => $remember])->assertNoContent();

        return $this->signedInAs($user);
    }

    private static function registerSignInRoute(): void
    {
        if (Route::has('browser.sign-in')) {
            return;
        }
        Route::prefix('api')->middleware('api')->group(function () {
            Route::post('/_browser/sign-in', function () {
                $user = User::findOrFail(request()->integer('id'));
                Auth::guard('web')->login($user, request()->boolean('remember'));
                session()->regenerate();
                session()->put('taller.authenticated_at', now()->getTimestamp());

                return response()->noContent();
            })->name('browser.sign-in');
        });
        app('router')->getRoutes()->refreshNameLookups();
    }

    /** @param array<string, mixed> $data */
    public function send(string $method, string $uri, array $data = []): TestResponse
    {
        $server = ['REMOTE_ADDR' => $this->ip, 'CONTENT_TYPE' => 'application/json'];
        if ($this->acceptsJson) {
            $server['HTTP_ACCEPT'] = 'application/json';
        }
        if (isset($this->cookies['XSRF-TOKEN'])) {
            $server['HTTP_X_XSRF_TOKEN'] = $this->cookies['XSRF-TOKEN'];
        }
        $accountHeader = $this->accountHeader ?? ($this->signedInId === null ? null : (string) $this->signedInId);
        if ($accountHeader !== null && ! $this->withoutAccountHeader) {
            $server['HTTP_X_TALLER_USER'] = $accountHeader;
        }

        $server += $this->extraServerVars;
        $this->startFreshProcess();
        $response = $this->test->call($method, $uri, [], $this->cookies, [], $server, $data === [] ? null : json_encode($data, JSON_THROW_ON_ERROR));
        $this->storeCookiesOf($response);

        return $response;
    }

    /** The framework keeps guards, the session store and queued cookies for the life of the process; each request here starts without them. */
    private function startFreshProcess(): void
    {
        Auth::forgetGuards();
        app()->forgetInstance('auth.driver');
        app('session')->forgetDrivers();
        app()->forgetInstance('session.store');
        app('cookie')->flushQueuedCookies();
    }

    private function storeCookiesOf(TestResponse $response): void
    {
        foreach ($response->headers->getCookies() as $cookie) {
            $expired = $cookie->getExpiresTime() !== 0 && $cookie->getExpiresTime() < time();
            if ($expired || $cookie->getValue() === null) {
                unset($this->cookies[$cookie->getName()]);
            } else {
                $this->cookies[$cookie->getName()] = $cookie->getValue();
            }
        }
    }
}
