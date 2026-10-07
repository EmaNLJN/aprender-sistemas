<?php

namespace App\Progress\Operations;

enum FieldType
{
    case ExerciseKey;
    case Key;
    case Language;
    case Bool;
    case TrueFlag;
    case Answer;
    case HintCount;
    case Text;
    case NullableText;
    case StarterHash;
    case ContentVersion;
    case Confidence;
    case StudyInstant;
    case MarkKind;
    case NoteField;
    case PreferenceName;
    case PreferenceValue;
}
