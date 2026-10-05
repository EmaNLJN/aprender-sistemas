<?php

namespace App\Http\Controllers;

use App\Content\ContentDelivery;
use App\Content\InvalidPortionRequest;
use App\Content\Portion;
use App\Http\ApiError;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Los recursos de contenido (ADR 0006 §7): una porción por pedido, validada por sus parámetros, y
 * un ejercicio suelto. Sin sesión hasta C3, que los pone detrás de ella; sin throttle de Laravel.
 */
final class ContentController
{
    public function __construct(private ContentDelivery $delivery) {}

    public function exercises(Request $request): Response
    {
        return $this->portion($request, 'exercises');
    }

    public function exercise(Request $request, string $id): Response
    {
        return $this->delivery->exercise($request, $id);
    }

    public function worlds(Request $request): Response
    {
        return $this->portion($request, 'worlds');
    }

    public function workshops(Request $request): Response
    {
        return $this->portion($request, 'workshops');
    }

    public function atlas(Request $request): Response
    {
        return $this->portion($request, 'atlas');
    }

    public function guide(Request $request): Response
    {
        return $this->portion($request, 'guide');
    }

    private function portion(Request $request, string $resource): Response
    {
        try {
            $portion = Portion::resolve($resource, $request->query());
        } catch (InvalidPortionRequest $error) {
            return ApiError::response(422, 'validation_failed', $error->getMessage(), ['errors' => $error->errors]);
        }

        return $this->delivery->portion($request, $portion);
    }
}
