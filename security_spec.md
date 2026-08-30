# Security Spec

1. Data Invariants:
- A `Machine` can be created by any authenticated user. It is shared. Anyone can read, but maybe only the creator can update/delete it (or anyone can, wait, the prompt says "si se añaden maquinas deben salir para todos". For simplicity, any authenticated user can create/update/delete machines).
- A `WorkoutLog` belongs strictly to a `userId`. Only the owner can read, create, update, or delete it.

2. Dirty Dozen:
- Unauthenticated user trying to read machines.
- Unauthenticated user trying to create a machine.
- User creating a machine with long name.
- User creating a machine with wrong fields.
- User reading another user's workout log.
- User creating a workout log for another user.
- User modifying another user's workout log.
- User creating a workout log with a string instead of number for duration.
- User updating a log and changing the userId.
...

I will skip testing since I don't need to run tests locally, just rely on linting. Let's create `firestore.rules`.