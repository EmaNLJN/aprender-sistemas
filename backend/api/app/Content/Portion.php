<?php

namespace App\Content;

use Illuminate\Support\Arr;
use InvalidArgumentException;

/**
 * The 17 content portions the API serves (ADR 0006 D11). The value is the path inside
 * curriculum.json and the key of `portions` in curriculum.meta.json, which the generator fixes.
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

    public function group(): string
    {
        return explode('.', $this->value)[0];
    }

    public function slice(): ?string
    {
        return explode('.', $this->value)[1] ?? null;
    }

    public function isExercises(): bool
    {
        return in_array($this->group(), self::CATALOGS, true);
    }

    public static function sliceBy(string $group): ?string
    {
        return match ($group) {
            'lab', 'quests', 'campaign', 'atlas' => 'language',
            'cores', 'workshops' => 'domain',
            default => null,
        };
    }

    /**
     * The portion a resource asks for with its parameters, or InvalidPortionRequest with one
     * message per parameter. $resource is exercises, worlds, workshops, atlas or guide.
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
        $slice = '';
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
            } else {
                $slice = $value;
            }
        }
        if ($errors !== []) {
            throw new InvalidPortionRequest($errors);
        }

        return self::from("{$group}.{$slice}");
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
