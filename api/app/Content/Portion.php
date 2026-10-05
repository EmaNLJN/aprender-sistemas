<?php

namespace App\Content;

use Illuminate\Support\Arr;
use InvalidArgumentException;

/**
 * Las 17 porciones de contenido que sirve la API (ADR 0006 D11). El valor es la ruta dentro de
 * curriculum.json y la clave de `portions` en curriculum.meta.json, que fija el generador.
 */
enum Portion: string
{
    case LabRust = 'lab.rust';
    case LabGo = 'lab.go';
    case QuestsRust = 'quests.rust';
    case QuestsGo = 'quests.go';
    case CoresLowlevel = 'cores.lowlevel';
    case CoresInfra = 'cores.infra';
    case CoresPlay = 'cores.play';
    case CoresPc = 'cores.pc';
    case CampaignRust = 'campaign.rust';
    case CampaignGo = 'campaign.go';
    case WorkshopsLowlevel = 'workshops.lowlevel';
    case WorkshopsInfra = 'workshops.infra';
    case WorkshopsPlay = 'workshops.play';
    case WorkshopsPc = 'workshops.pc';
    case AtlasRust = 'atlas.rust';
    case AtlasGo = 'atlas.go';
    case Guide = 'guide';

    public const LANGUAGES = ['rust', 'go'];

    public const DOMAINS = ['lowlevel', 'infra', 'play', 'pc'];

    public const CATALOGS = ['lab', 'quests', 'cores'];

    /** lab, quests, cores, campaign, workshops, atlas o guide. */
    public function group(): string
    {
        return explode('.', $this->value)[0];
    }

    /** El lenguaje o el dominio que corta la porción; null en la guía. */
    public function slice(): ?string
    {
        return explode('.', $this->value)[1] ?? null;
    }

    public function isExercises(): bool
    {
        return in_array($this->group(), self::CATALOGS, true);
    }

    /** El parámetro de consulta que corta el recurso: language, domain o null (la guía). */
    public static function sliceBy(string $group): ?string
    {
        return match ($group) {
            'lab', 'quests', 'campaign', 'atlas' => 'language',
            'cores', 'workshops' => 'domain',
            default => null,
        };
    }

    /**
     * La porción que pide un recurso con sus parámetros, o InvalidPortionRequest con un mensaje
     * por parámetro. $resource es exercises, worlds, workshops, atlas o guide.
     *
     * @param  array<string, mixed>  $query
     */
    public static function resolve(string $resource, array $query): self
    {
        $group = match ($resource) {
            'exercises' => self::catalogOf($query),
            'worlds' => 'campaign',
            'workshops', 'atlas', 'guide' => $resource,
            default => throw new InvalidArgumentException("Recurso de contenido desconocido: {$resource}"),
        };
        $sliceBy = self::sliceBy($group);
        if ($sliceBy === null) {
            return self::Guide;
        }

        $allowed = ['language' => self::LANGUAGES, 'domain' => self::DOMAINS];
        $errors = [];
        foreach ($allowed as $param => $values) {
            if ($param !== $sliceBy) {
                if (array_key_exists($param, $query)) {
                    $errors[$param] = ["Sobra el parámetro {$param}: este recurso se corta por {$sliceBy}."];
                }

                continue;
            }
            $value = $query[$param] ?? null;
            $options = Arr::join($values, ', ', ' o ');
            if ($value === null) {
                $errors[$param] = ["Falta el parámetro {$param}: usá {$options}."];
            } elseif (! is_string($value) || ! in_array($value, $values, true)) {
                $errors[$param] = ["El valor de {$param} no es válido: usá {$options}."];
            }
        }
        if ($errors !== []) {
            throw new InvalidPortionRequest($errors);
        }

        return self::from("{$group}.{$query[$sliceBy]}");
    }

    /** @param array<string, mixed> $query */
    private static function catalogOf(array $query): string
    {
        $catalog = $query['catalog'] ?? null;
        if (! is_string($catalog) || ! in_array($catalog, self::CATALOGS, true)) {
            $options = Arr::join(self::CATALOGS, ', ', ' o ');
            throw new InvalidPortionRequest(['catalog' => ["Falta el catálogo o no es válido: usá {$options}."]]);
        }

        return $catalog;
    }
}
