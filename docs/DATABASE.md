# Database Structure and Maintenance

This document outlines important information about our database structure and how to maintain consistency between environments.

## Environment Differences Found (2025-02-04)

### Platform Mappings
1. Production had:
   - Primary key on `id` (bigint)
   - NOT NULL constraints on all columns
   - Unique constraint on (rawg_id, platform_id)
   - Required `rawg_name` column
2. Development was missing:
   - `id` column
   - `rawg_name` column
   - Proper constraints

### Genre Mappings
1. Production had:
   - Primary key on `id` (bigint)
   - NOT NULL constraints on all columns
   - Unique constraint on (rawg_id, genre_id)
   - Required `rawg_name` column
2. Development was missing:
   - The entire table structure

### RLS Policies
1. Production had:
   - Consistent naming for platform policies
   - No duplicate policies
2. Development had:
   - Duplicate policies for game_genres and platforms
   - Inconsistent naming conventions

## Maintaining Environment Consistency

### Setup New Development Environment
1. Always use `supabase/dev-setup.sql` to create new tables
2. Run all migrations in order
3. Verify structure using `scripts/validate-db.sql`

### Making Database Changes
1. Update `dev-setup.sql` first
2. Test changes in development
3. Create migration script if needed
4. Apply changes to production
5. Verify both environments match using validation script

### Regular Validation
Run `scripts/validate-db.sql` in both environments and compare output to ensure:
1. Table structures match
2. Constraints are identical
3. RLS policies are consistent
4. No unexpected differences exist

## Common Issues

### Missing NOT NULL Constraints
Always explicitly specify NOT NULL in table definitions when the column should not accept null values.

### Duplicate RLS Policies
Before creating new policies, check existing ones to avoid duplicates. Use consistent naming conventions.

### ID Generation
For tables requiring a bigint ID:
- Use `id bigint NOT NULL PRIMARY KEY`
- In code, generate IDs using `Date.now()`
