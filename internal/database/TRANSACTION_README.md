# Transaction Management

This package provides transaction management utilities for the Biotak Go backend.

## Features

### Automatic Rollback on Failure

The `WithTx` and `WithTxResult` functions automatically handle transaction rollback in the following scenarios:

1. **Function returns an error**: The transaction is rolled back and the error is returned
2. **Panic occurs**: The transaction is rolled back and the panic is re-raised
3. **Successful completion**: The transaction is committed

### Usage Examples

#### Basic Transaction

```go
err := database.WithTx(ctx, client, func(ctx context.Context, tx *ent.Tx) error {
    // Create user
    user, err := tx.User.Create().
        SetEmail("test@example.com").
        SetPassword("hashed").
        SetName("Test User").
        Save(ctx)
    if err != nil {
        return err // Transaction will be rolled back
    }

    // Create profile
    _, err = tx.Profile.Create().
        SetUser(user).
        SetBio("Test bio").
        Save(ctx)
    if err != nil {
        return err // Transaction will be rolled back, user creation undone
    }

    return nil // Transaction will be committed
})
```

#### Transaction with Result

```go
post, err := database.WithTxResult(ctx, client, func(ctx context.Context, tx *ent.Tx) (*ent.Post, error) {
    // Create post
    p, err := tx.Post.Create().
        SetTitle("Test Post").
        SetSlug("test-post").
        SetContent("Content").
        Save(ctx)
    if err != nil {
        return nil, err // Transaction will be rolled back
    }

    // Add categories
    err = tx.Post.UpdateOneID(p.ID).
        AddCategoryIDs(categoryIDs...).
        Exec(ctx)
    if err != nil {
        return nil, err // Transaction will be rolled back, post creation undone
    }

    return p, nil // Transaction will be committed
})
```

## Rollback Behavior

### On Error

When any operation within the transaction returns an error:
1. The transaction is immediately rolled back
2. All changes made within the transaction are undone
3. The database state is restored to before the transaction began
4. The error is returned to the caller

### On Panic

When a panic occurs within the transaction:
1. The deferred rollback function is executed
2. The transaction is rolled back
3. All changes are undone
4. The panic is re-raised for the caller to handle

### Multiple Operations

When multiple operations are performed in a transaction:
- If ANY operation fails, ALL operations are rolled back
- This ensures atomicity - either all changes succeed or none do
- Example: Creating a post with categories and tags - if adding tags fails, the post creation is also rolled back

## Testing

Transaction rollback behavior is tested in `transaction_test.go`:

- `TestWithTx_RollbackOnError`: Verifies rollback when function returns error
- `TestWithTx_RollbackOnPanic`: Verifies rollback when panic occurs
- `TestWithTx_MultipleOperations_RollbackAll`: Verifies all operations are rolled back on error

To run tests with a real database:
```bash
# Set up test database
export DATABASE_URL="postgresql://user:pass@localhost:5432/biotak_test"

# Run integration tests
go test -v ./tests/integration/...
```

## Implementation Details

The transaction wrapper uses Ent's built-in transaction support:

1. **Begin**: `client.Tx(ctx)` starts a new transaction
2. **Defer**: A deferred function ensures rollback on panic
3. **Execute**: The provided function is executed with the transaction context
4. **Rollback**: If an error occurs, `tx.Rollback()` is called
5. **Commit**: If successful, `tx.Commit()` is called

The implementation guarantees that:
- Transactions are always properly closed (committed or rolled back)
- No partial changes are left in the database
- Errors are properly propagated to the caller
- Panics are handled gracefully with rollback

## Best Practices

1. **Keep transactions short**: Long-running transactions can cause performance issues
2. **Avoid external calls**: Don't make HTTP requests or other I/O within transactions
3. **Handle errors properly**: Always check and return errors from database operations
4. **Use appropriate isolation**: Ent uses the database's default isolation level
5. **Test rollback scenarios**: Always test that rollback works correctly for your use case


## Deadlock Retry Logic

The system automatically detects and retries transactions that fail due to database deadlocks.

### Features

- **Automatic Detection**: Detects PostgreSQL deadlock errors (error code 40P01)
- **Exponential Backoff**: Retries with increasing delays (100ms, 200ms, 400ms)
- **Maximum Retries**: Up to 3 retry attempts before giving up
- **Context Awareness**: Respects context cancellation during retries

### Usage

#### Basic Retry

```go
err := database.WithTxRetry(ctx, client, func(ctx context.Context, tx *ent.Tx) error {
    // Perform operations that might deadlock
    user1, err := tx.User.Get(ctx, userID1)
    if err != nil {
        return err
    }

    user2, err := tx.User.Get(ctx, userID2)
    if err != nil {
        return err
    }

    // Update both users (potential deadlock scenario)
    err = tx.User.UpdateOneID(userID1).
        SetName("Updated Name 1").
        Exec(ctx)
    if err != nil {
        return err
    }

    err = tx.User.UpdateOneID(userID2).
        SetName("Updated Name 2").
        Exec(ctx)
    if err != nil {
        return err
    }

    return nil
})

// If deadlock occurs, transaction will be retried automatically
// If max retries exceeded, ErrMaxRetriesExceeded is returned
```

#### Retry with Result

```go
post, err := database.WithTxResultRetry(ctx, client, func(ctx context.Context, tx *ent.Tx) (*ent.Post, error) {
    // Operations that might deadlock
    return tx.Post.Create().
        SetTitle("New Post").
        SetSlug("new-post").
        SetContent("Content").
        Save(ctx)
})
```

### Deadlock Detection

The system detects deadlocks through:

1. **PostgreSQL Error Code**: Checks for error code "40P01"
2. **Error Message**: Checks for "deadlock" or "lock wait timeout" in error message

### Retry Strategy

When a deadlock is detected:

1. **First Retry**: Wait 100ms, then retry
2. **Second Retry**: Wait 200ms, then retry
3. **Third Retry**: Wait 400ms, then retry
4. **Failure**: Return `ErrMaxRetriesExceeded` after 3 attempts

### Best Practices

1. **Use for High-Contention Operations**: Apply retry logic to operations that frequently access the same records
2. **Keep Transactions Short**: Shorter transactions reduce deadlock probability
3. **Consistent Lock Order**: Always acquire locks in the same order across transactions
4. **Monitor Deadlocks**: Log and monitor deadlock occurrences to identify problematic code
5. **Consider Alternatives**: For very high contention, consider optimistic locking or queue-based processing

### Example: Preventing Deadlocks

```go
// BAD: Inconsistent lock order can cause deadlocks
// Transaction 1: Lock A, then Lock B
// Transaction 2: Lock B, then Lock A

// GOOD: Consistent lock order prevents deadlocks
// Always lock in the same order (e.g., by ID)
func transferBetweenUsers(ctx context.Context, client *ent.Client, fromID, toID string, amount int) error {
    // Sort IDs to ensure consistent lock order
    ids := []string{fromID, toID}
    sort.Strings(ids)

    return database.WithTxRetry(ctx, client, func(ctx context.Context, tx *ent.Tx) error {
        // Lock users in consistent order
        user1, err := tx.User.Get(ctx, ids[0])
        if err != nil {
            return err
        }

        user2, err := tx.User.Get(ctx, ids[1])
        if err != nil {
            return err
        }

        // Perform updates
        // ...

        return nil
    })
}
```

## Optimistic Locking

Optimistic locking prevents lost updates when multiple transactions try to modify the same record concurrently.

### How It Works

1. Each record has a `version` field that increments on every update
2. When updating, the client provides the expected version
3. The system checks if the current version matches the expected version
4. If versions match, the update proceeds and version is incremented
5. If versions don't match, `ErrVersionMismatch` is returned

### Usage

#### Updating with Version Check

```go
// Client reads post with version 5
post, err := postService.GetPostByID(ctx, postID)
// post.Version = 5

// Client updates post, providing the version
updateReq := UpdatePostRequest{
    Title:   &newTitle,
    Version: &post.Version, // Version 5
}

updatedPost, err := postService.UpdatePost(ctx, postID, updateReq, userID, userRole)
if errors.Is(err, database.ErrVersionMismatch) {
    // Another transaction modified the post
    // Reload and retry, or notify user of conflict
}
```

### Conflict Resolution

When a version mismatch occurs:

1. **Reload**: Fetch the latest version of the record
2. **Merge**: Merge changes if possible
3. **Notify**: Inform the user of the conflict
4. **Retry**: Let the user retry with the latest version

### Example: Handling Version Conflicts

```go
func updatePostWithRetry(ctx context.Context, service *PostService, postID string, updates UpdatePostRequest) (*ent.Post, error) {
    maxAttempts := 3

    for attempt := 0; attempt < maxAttempts; attempt++ {
        // Get latest post
        post, err := service.GetPostByID(ctx, postID)
        if err != nil {
            return nil, err
        }

        // Set version in update request
        updates.Version = &post.Version

        // Try to update
        updatedPost, err := service.UpdatePost(ctx, postID, updates, userID, userRole)
        if err == nil {
            return updatedPost, nil
        }

        // Check if it's a version mismatch
        if !errors.Is(err, database.ErrVersionMismatch) {
            return nil, err
        }

        // Version mismatch, retry
        time.Sleep(100 * time.Millisecond)
    }

    return nil, errors.New("failed to update post after multiple attempts")
}
```

### When to Use

- **Optimistic Locking**: Use when conflicts are rare and you want better performance
- **Pessimistic Locking**: Use when conflicts are common and you need to prevent them entirely
- **Deadlock Retry**: Use when pessimistic locking causes deadlocks

### Comparison

| Feature | Optimistic Locking | Pessimistic Locking | Deadlock Retry |
|---------|-------------------|---------------------|----------------|
| Performance | High | Low | Medium |
| Conflict Detection | After update | Before update | N/A |
| Suitable For | Low contention | High contention | Deadlock scenarios |
| User Experience | May need retry | Blocking | Transparent |
