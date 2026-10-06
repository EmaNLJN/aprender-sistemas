<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateNameRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return ['name' => ['required', 'string', 'max:80', 'not_regex:/\p{Cc}/u']];
    }

    public function newName(): string
    {
        return $this->string('name')->toString();
    }
}
