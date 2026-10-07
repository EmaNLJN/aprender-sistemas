<?php

namespace App\Progress\Operations;

enum OperationType: string
{
    case ExercisePrediction = 'exercise.prediction';
    case ExerciseAssist = 'exercise.assist';
    case ExerciseHints = 'exercise.hints';
    case ExerciseReflection = 'exercise.reflection';
    case ExerciseCustomTest = 'exercise.customTest';
    case ExerciseReview = 'exercise.review';
    case ExerciseDraft = 'exercise.draft';
    case CheckpointAnswer = 'checkpoint.answer';
    case WorkshopPrediction = 'workshop.prediction';
    case WorkshopNote = 'workshop.note';
    case WorkshopObjective = 'workshop.objective';
    case WorkshopStep = 'workshop.step';
    case RouteMark = 'route.mark';
    case RouteQuiz = 'route.quiz';
    case RouteNote = 'route.note';
    case PreferenceSet = 'preference.set';
}
