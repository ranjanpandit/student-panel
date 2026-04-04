# Attempt Shuffle Logic

This document explains how question and option shuffling works in the student attempt flow.

## Where It Is Implemented

- API: `app/api/exams/[id]/attempt/route.js`
- Function used for deterministic ordering: `seededScore(seedText, value)`

## Settings Used

From `exam_patterns`:

- `shuffle_questions` (0/1)
- `shuffle_options` (0/1)

These are loaded in the attempt API and applied before returning sections/questions/options to the UI.

## Core Principle: Deterministic Shuffle

Shuffle is **not random per page load**.  
It is deterministic per attempt, so students see a stable order after refresh/reopen.

### Why

- If order changed on every reload, saved answers would look incorrect.
- Deterministic order ensures answer mapping is stable.

## Seed Strategy

The hash seed includes `attempt.id`, so order is unique per attempt but stable within that attempt.

### Question order seed

- Seed pattern: ``${attempt.id}-${section.id}-q``
- Scored value: `question.id`

### Option order seed

- Seed pattern: ``${attempt.id}-${section.id}-${question.id}-o``
- Scored value: `option.id`

## Sequence Flow

1. Load sections/questions/options from DB.
2. For each section:
   - If `shuffle_questions=1`, sort section questions by deterministic seeded score.
3. For each question:
   - If `shuffle_options=1`, sort options by deterministic seeded score.
4. Return shuffled result to client.

## Saved Response Integrity

Responses are stored by IDs:

- Key format: `sectionId-questionId`
- Value: selected `option_id` (or array for multi-select)

Because shuffle only changes display order (not IDs), restore remains correct.

## Reopen/Resume Behavior

On reopen:

- API recomputes the same deterministic order using same `attempt.id`.
- Persisted answers are normalized and mapped back by IDs.
- UI selection checks compare numeric IDs safely.

Result: previously selected responses appear correctly after reopen.

## Related Notes

- Per-question timing (`question_time_json`) is independent of shuffle.
- Flash mode timer behavior uses question IDs, so it remains correct under shuffle.
