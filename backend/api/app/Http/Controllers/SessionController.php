<?php

namespace App\Http\Controllers;

use App\Auth\Features;
use App\Auth\PublishedUser;
use App\Content\ActiveCatalogs;
use App\Content\ContentImports;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

final class SessionController
{
    public function __construct(private ContentImports $imports, private ActiveCatalogs $catalogs, private Features $features) {}

    public function show(): JsonResponse
    {
        $user = Auth::user();

        return response()
            ->json([
                'user' => $user instanceof User ? PublishedUser::from($user)->toPublished() : null,
                'features' => [
                    'passwordReset' => $this->features->passwordReset(),
                    'registration' => $this->features->registration(),
                ],
                'contentVersion' => $this->imports->latestVersion(),
                'catalogs' => $this->catalogs->published(),
            ])
            ->header('Cache-Control', 'no-store');
    }
}
