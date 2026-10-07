<?php

namespace App\Auth;

enum Role: string
{
    case Admin = 'admin';
    case Student = 'student';
}
