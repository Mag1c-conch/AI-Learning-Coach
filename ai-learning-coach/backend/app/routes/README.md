Auth (`/auth`)
--------------

* `POST /auth/register` – Body must include `first_name`, `last_name`, `username`, `password`, `role` (`student` or `admin`). Returns `201` with `{ token, user }`. Useful for seeding accounts.
* `POST /auth/login` – Body: `username`, `password`, `role`. Returns `200` with `{ token, user }`. Token becomes the Bearer for subsequent calls.
* `GET /auth/me` – Requires `Authorization: Bearer <token>`. Returns the current user profile.

Courses (`/courses`)
--------------------

* `POST /courses` – Admins only. JSON: `course_name`, `course_code`, optional `description`, `image_url`, plus `created_by` (admin id). Returns `201` with the created course.
* `DELETE /courses/<course_id>` – Admins only. JSON needs `deleted_by`. Returns `200` on success.
* `GET /courses` – Optional query `created_by` to filter by creator. Returns an array with `creator_name`, `teacher`, `email`, `student_count`.
* `GET /courses/<course_id>` – Returns single course with `student_count`.
* `POST /courses/<course_id>/enroll` – Students supply `student_id` in the body. 201 when the enrolment is new, 409 if already enrolled.
* `GET /courses/users/<user_id>/enrollments` – Lists courses a user participates in.
* `GET /courses/<course_id>/students` – Only the course owner (admin) can view student roster (`enrolled_at` included).

Assignments (`/assignments`)
----------------------------

* `GET /assignments?course_id=` – Filter by course, sorted by `due_date`.
* `POST /assignments` – Teachers/admins create assignments: `course_id`, `title`, `description`, ISO `due_date`, `teacher_id`, optional `optional=true/false`.
* `POST /assignments/<id>/grades` – Teachers grade submissions: `teacher_id`, `student_id`, numeric `score`, optional `comment`. Returns `201` for new grade, `200` for updates.
* `GET /assignments/<id>/grades?viewer_id=` – Students only see their own grade. Teachers can add `student_id` filter and `include_related` flag.

Materials & Submissions (`/materials`)
--------------------------------------

* `GET /materials?course_id=&include_submissions=` – Default shows teaching materials only; set `include_submissions=true` to include student uploads.
* `POST /materials` – Admin upload (multipart). Required fields: `file`, `course_id`, `uploaded_by`. Optional: `file_type`, `week_number`, `custom_name`, `assignment_id`, or inline assignment metadata (`assignment_title`, `assignment_description`, ISO `assignment_due_date`, `assignment_optional`).
* `DELETE /materials/<material_id>?deleted_by=` – Admin delete. When the file is the last attachment for an assignment, response includes `assignment_id`.
* `GET /materials/<id>/download?preview=true` – Streams or downloads the file.
* `POST /materials/assignments/<assignment_id>/submissions` – Students submit assignments (multipart with `file`, `student_id`).
* `GET /materials/assignments/<assignment_id>/submissions?viewer_id=` – Teachers see everything (with optional `student_id` filter); students see only their own submissions.

Study Progress (`/progress`)
----------------------------

* `GET /progress/study/<student>/<course>` – Students fetch their progress for a course, including `overall_percent` and per-item data.
* `PUT /progress/study/<student>/<course>` – Students update progress. Body example: `{"items": [{"item_key": "wk1", "percent": 60, "title": "..."}], "replace": false}`. Setting `replace=true` removes untouched keys.
* `GET /progress/courses/<student>?course_id=...` – Aggregated completion per course.
* `GET /progress/course/<course>/students` – Course owner sees all enrolled students with averaged progress numbers.

Feedback (`/feedback`)
----------------------

* `POST /feedback` – Teachers send feedback: `teacher_id`, `student_id`, optional `course_id`, `content`.
* `GET /feedback?teacher_id=&student_id=&course_id=` – At least one filter is required. `include_related` controls whether teacher/student/course info is embedded.
* `PATCH /feedback/<id>/read` – Students toggle read state. Body: `student_id`, optional `is_read` (defaults to true).
* `DELETE /feedback/<id>?student_id=` – Students delete their own feedback records.

AI Assistant & Study Plans
--------------------------

* `POST /assistant/chat` – Body includes `messages` (array of `{role, content}`), optional `conversation_id`, `conversation_title`, `user_id`. Returns `conversation_id`, historical `messages`, and the assistant reply. `OPTIONS` is handled for CORS preflight.
* `GET /assistant/conversations?user_id=` – Optional `limit`, `include_messages`, `message_limit`. Lists conversations for the authenticated user.
* `GET /assistant/conversations/<id>?user_id=` – Fetch a single conversation (optional `message_limit`).
* `DELETE /assistant/conversations/<id>?user_id=` – Remove a conversation and its messages.
* `POST /assistant/grade_submission` – Teachers trigger AI grading: `material_id`, optional `teacher_id`, optional `rubric`, `instructions`, `max_score`. Response includes `{ grading, raw_reply, metadata }`.
* `POST /get_plan` – Body: `student_id`. Gemini generates a 7-day study plan (falls back to deterministic plan if AI fails) and stores it in `StudyPlan`.
* `GET /assistant/study_plan/<student>?week_start=YYYY-MM-DD` – Retrieve the latest (or specific week’s) stored plan.

Notes & Tips
------------

* File uploads/downloads live under `backend/instance/uploads`. Production deployments need persistent storage there.
* Authenticated calls expect `Authorization: Bearer <token>` from `/auth/login` or `/auth/register`. Only a handful of routes (e.g., `/get_plan`) skip JWT enforcement.
* Gemini-dependent endpoints (`/assistant/chat`, `/assistant/grade_submission`, `/get_plan`) require `GEMINI_API_KEY`/`GEMINI_MODEL` in the environment. Failures bubble up as 4xx/5xx with descriptive error text.
* Progress `item_key` works like an upsert key. Reusing the same key overwrites the record; supplying `"replace": true` deletes entries not present in the payload.
