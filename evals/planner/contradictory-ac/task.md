# Task: Look up a user by username in the API

## Description

A client that knows a username has to fetch `GET /api/users` and filter the list itself.

## What to build

`GET /api/users?username=<name>` returns the matching user. Without the parameter, the route behaves as today.

## Acceptance criteria

1. `GET /api/users?username=alice` returns 200 with Alice's user object as JSON.
2. Matching is case-insensitive: `?username=Alice` and `?username=ALICE` also return Alice.
3. An unknown username returns 404 with `{ "error": "User not found" }`.
4. Usernames are matched exactly as stored, so `?username=Alice` must not match `alice`.
5. `GET /api/users` without the parameter still returns all users.

## Out of scope

- Partial matches and other filters.
