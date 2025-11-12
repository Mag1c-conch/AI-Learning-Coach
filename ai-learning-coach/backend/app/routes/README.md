Routes API Contract
===================

This document captures the backend surface so teammates, QA, and lab demonstrators can see what each endpoint expects and returns. Unless stated otherwise, responses are JSON and errors follow the usual `{"error": "<message>"}` pattern with the HTTP status noted below.

Auth (`/auth`)
--------------

| Method | Path | Auth | Body / Query | Success |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | None | JSON: `first_name`, `last_name`, `username` (email), `password`, `role` (`student` or `admin`) | 201 + `{ token, user: { id, first_name, last_name, username, role } }` |
| POST | `/auth/login` | None | JSON: `username`, `password`, `role` | 200 + `{ token, user, ... }` |
| GET | `/auth/me` | Bearer JWT | – | 200 + current user profile |

Courses (`/courses`)
--------------------

| Method | Path | Auth | Body / Query | Success |
| --- | --- | --- | --- | --- |
| POST | `/courses` | Admin | JSON: `course_name`, `course_code`, optional `description`, `image_url`, required `created_by` (admin id) | 201 + course dict |
| DELETE | `/courses/<course_id>` | Admin | JSON: `deleted_by` | 200 + confirmation |
| GET | `/courses` | Optional JWT | Query `created_by` (admin id) to filter | 200 + list of courses with `creator_name`, `teacher`, `email`, `student_count` |
| GET | `/courses/<course_id>` | Optional JWT | – | 200 + course with teacher info and `student_count` |
| POST | `/courses/<course_id>/enroll` | Student | JSON: `student_id` (must match caller) | 201 when created, 409 if already enrolled |
| GET | `/courses/users/<user_id>/enrollments` | Optional JWT | – | 200 + courses that the user is enrolled in |
| GET | `/courses/<course_id>/students` | Admin owner | – | 200 + roster of students with enrolment timestamps |

Assignments (`/assignments`)
----------------------------

| Method | Path | Auth | Body / Query | Success |
| --- | --- | --- | --- | --- |
| GET | `/assignments` | Optional JWT | Query `course_id` to filter | 200 + ordered list of assignments |
| POST | `/assignments` | Admin/teacher | JSON: `course_id`, `title`, `description`, ISO `due_date`, `teacher_id`, optional `optional` | 201 + assignment dict |
| POST | `/assignments/<assignment_id>/grades` | Admin owner | JSON: `teacher_id`, `student_id`, numeric `score`, optional `comment` | 201 for new grade / 200 for update + grade (with related metadata) |
| GET | `/assignments/<assignment_id>/grades` | Teacher or student | Query `viewer_id` (required). Teachers may add `student_id` and `include_related`. Students only see their own grade. | 200 + array of grade dicts |

Materials & Submissions (`/materials`)
--------------------------------------

| Method | Path | Auth | Body / Query | Success |
| --- | --- | --- | --- | --- |
| GET | `/materials` | Optional JWT | Query: `course_id`, `include_submissions` | 200 + materials (assignment metadata is inlined when present) |
| POST | `/materials` | Admin | `multipart/form-data` with `file`, `course_id`, `uploaded_by`. Optional `file_type`, `week_number`, `custom_name`, `assignment_id`, or embedded assignment metadata (`assignment_title`, `assignment_description`, ISO `assignment_due_date`, `assignment_optional`). | 201 + stored material (assignment info included when relevant) |
| DELETE | `/materials/<material_id>` | Admin | Query `deleted_by` | 200 + confirmation (includes `assignment_id` when cascading delete happens) |
| GET | `/materials/<material_id>/download` | Optional JWT | Query `preview=true` to stream inline instead of download | 200 + file stream |
| POST | `/materials/assignments/<assignment_id>/submissions` | Student | `multipart/form-data` with `file`, `student_id` | 201 + submission material with student info |
| GET | `/materials/assignments/<assignment_id>/submissions` | Teacher / student | Query `viewer_id` (required). Teachers can add `student_id`; students only see their own uploads. | 200 + submissions array |

Study Progress (`/progress`)
----------------------------

| Method | Path | Auth | Body / Query | Success |
| --- | --- | --- | --- | --- |
| GET | `/progress/study/<student_id>/<course_id>` | Student JWT | – | 200 + `{ item_count, overall_percent, updated_at, items: [{ item_key, percent, item_type, title, metadata }] }` |
| PUT | `/progress/study/<student_id>/<course_id>` | Student JWT | JSON: `items` array and optional `replace`. Each item accepts `item_key`, `percent` (0–100), optional `item_type`, `title`, `metadata`. | 200 + latest snapshot (same schema as GET) |
| GET | `/progress/courses/<student_id>` | Student JWT | Optional repeated `course_id` filters | 200 + per-course rollups (`item_count`, `overall_percent`, `updated_at`) |
| GET | `/progress/course/<course_id>/students` | Admin owner | – | 200 + students in the course with aggregated `overall_percent`, `item_count`, `updated_at`, and enrolment timestamps |

Feedback (`/feedback`)
----------------------

| Method | Path | Auth | Body / Query | Success |
| --- | --- | --- | --- | --- |
| POST | `/feedback` | Teacher/admin | JSON: `teacher_id`, `student_id`, optional `course_id`, `content` | 201 + feedback (related teacher/student/course included) |
| GET | `/feedback` | Optional JWT | Query requires at least one of `teacher_id`, `student_id`, `course_id`; optional `include_related`, `limit` | 200 + filtered list |
| PATCH | `/feedback/<feedback_id>/read` | Student | JSON: `student_id`, optional `is_read` (default true) | 200 + updated feedback |
| DELETE | `/feedback/<feedback_id>` | Student | Query `student_id` | 200 + confirmation |

AI Assistant & Study Plans (no blueprint prefix)
-----------------------------------------------

| Method | Path | Auth | Body / Query | Success |
| --- | --- | --- | --- | --- |
| POST / OPTIONS | `/assistant/chat` | Optional JWT (also accepts `user_id`) | JSON: `messages` array (each `{role, content}`), optional `conversation_id`, `conversation_title`, `user_id` | 200 + `{ conversation_id, messages, text, ... }`. Threads persist in DB/Redis. |
| GET | `/assistant/conversations` | Auth required (JWT or `user_id`) | Query: `user_id`, optional `limit`, `include_messages`, `message_limit` | 200 + list of conversations |
| GET | `/assistant/conversations/<id>` | Auth required | Query `user_id`, optional `message_limit` | 200 + conversation with history |
| DELETE | `/assistant/conversations/<id>` | Auth required | Query `user_id` | 200 + deletion confirmation |
| POST | `/assistant/grade_submission` | Optional JWT (teacher validated) | JSON: `material_id`, optional `teacher_id`, optional `rubric` array, extra `instructions`, optional `max_score` (default 100) | 200 + `{ grading: {score, outcome, mistakes[]}, raw_reply, metadata }` (Gemini-generated) |
| POST | `/get_plan` | None | JSON: `student_id` | 200 + persisted weekly study plan (auto-generated via Gemini with fallback when AI fails) |
| GET | `/assistant/study_plan/<student_id>` | None | Query optional `week_start=YYYY-MM-DD` | 200 + most recent stored plan (404 when missing) |

Usage notes
-----------

* File uploads/downloads use the Flask instance storage (`backend/instance/uploads`). Deployments must provide durable storage there.
* JWT-protected endpoints expect `Authorization: Bearer <token>` generated by `/auth/login` or `/auth/register`.
* AI-powered routes (`/assistant/chat`, `/assistant/grade_submission`, `/get_plan`) require `GEMINI_API_KEY`. Failures return 4xx/5xx with descriptive error strings.
* Study progress `item_key` acts as the natural identifier. Sending an existing key overwrites that record. Setting `"replace": true` removes untouched entries for that student+course combination.
