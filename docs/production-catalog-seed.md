# Production catalog seed: backend handoff

Status: proposed import-file contract, based on the current catalog DTOs, entities,
and service. This document and the companion JSON are implementation inputs;
there is no production catalog importer or command implemented by this change.
Do not POST the entire JSON to an existing API endpoint.

Scope: outlets, menu categories, menu items, modifier groups, modifier options,
item/group assignments, and optional preparation suggestions. Accounts, orders,
payments, settlements, promotions, and delivery geofence creation are excluded.

## Terminology

- Menu category: browsing section such as Starters, Main Meals, Drinks, or Sides.
- Menu item: a separately orderable dish or drink within one category.
- Modifier group: a selection presented when configuring a dish, such as Protein
  or Add-ons. Groups are reusable across multiple items within one outlet.
- Modifier: an individual selection, such as Extra Chicken, with a price delta.
- Preparation suggestion: text such as Less salt; not a priced modifier.
- An independently orderable side belongs in menu items. An extra selectable
  only with a dish belongs in modifiers. The label Add-ons alone does not decide.

## File contract

Use `production-catalog-seed.example.json` as the template. All example names,
UUIDs, prices, locations, fees, and URLs are fictional and must be replaced.

| Root key               | Type    | Required | Meaning                                          |
| ---------------------- | ------- | -------- | ------------------------------------------------ |
| schemaVersion          | integer | Yes      | Exactly `1`; importer must reject other versions |
| outlets                | array   | Yes      | Outlet records; empty array allowed              |
| menuCategories         | array   | Yes      | Category records                                 |
| modifierGroups         | array   | Yes      | Selection groups                                 |
| modifiers              | array   | Yes      | Options belonging to groups                      |
| menuItems              | array   | Yes      | Meals and their group assignments                |
| preparationSuggestions | array   | Yes      | Use `[]` if not needed                           |

The names above are import collection names, not database table names.
Reject unknown keys and invalid types before any writes. Use real JSON booleans,
integers for minor-unit money, and strings for UUIDs. Trim human-readable strings.
Every record requires a stable UUID v4 `id`, including preparation suggestions.
For existing records use the actual production ID. For new records generate once,
store in the approved import file, and reuse on every run. Never match by name.
A same-name record with a different ID must be reported for review, not silently
merged or duplicated. Do not reassign an existing record to a different outlet.

### Missing values and reruns

These are proposed importer rules, not guarantees of the existing demo script:

- Required fields must be present for inserts and updates.
- Optional omitted fields use the insert default below for NEW rows and retain
  the stored value for EXISTING rows.
- Explicit `null` clears only fields marked nullable below; reject it elsewhere.
- No row is deleted merely because it is absent from the file.
- `modifierGroupIds` is required: it replaces that item's assignments; `[]`
  deliberately removes all assignments. Preview these removals in the dry run.
- Reject references to soft-deleted rows and attempts to revive them implicitly.
- UUID references can target a row in this file or an existing active DB row.
- Currency is always NGN, supplied by the importer, not a user-editable field.
- Do not accept timestamps, rating counts/averages, deletedAt, currentPriceMinor,
  or isDiscountActive. These are generated, customer-derived, or computed.

## Outlets -> outlets

`id`, `name`, `cuisineType`, and `isOnline` are required by this import contract.
Requiring an explicit online flag is stricter than the API's default of true.
Keep a new outlet offline until its catalog and operations configuration are checked.

| Key                      | Type / validation                     | Required | New-row default |
| ------------------------ | ------------------------------------- | -------- | --------------- |
| id                       | UUID v4                               | Yes      | None            |
| name                     | string, 2-255 characters              | Yes      | None            |
| cuisineType              | string, 2-100 characters              | Yes      | None            |
| isOnline                 | boolean                               | Yes      | None            |
| description              | string up to 2000, nullable           | No       | null            |
| address                  | string up to 1000, nullable           | No       | null            |
| imageUrl                 | absolute URL, up to 512, nullable     | No       | null            |
| logoUrl                  | absolute URL, up to 512, nullable     | No       | null            |
| bannerUrl                | absolute URL, up to 512, nullable     | No       | null            |
| vatBps                   | integer 0-10000                       | No       | 0               |
| latitude                 | number -90 to 90, nullable            | No       | null            |
| longitude                | number -180 to 180, nullable          | No       | null            |
| deliveryRadiusKm         | number >= 0.1                         | No       | 15              |
| settlementSubaccountCode | string 2-100, no whitespace, nullable | No       | null            |
| deliveryPricingModel     | FLAT, PER_KM, or PER_LOCATION         | No       | FLAT            |
| deliveryFeeMinor         | integer >= 0                          | No       | 150000          |
| deliveryBaseFeeMinor     | integer >= 0                          | No       | 0               |
| deliveryPricePerKmMinor  | integer >= 0                          | No       | 0               |
| deliveryLocationFees     | array of objects described below      | No       | []              |

Each deliveryLocationFees object:

| Key          | Type / validation                               | Required | Default |
| ------------ | ----------------------------------------------- | -------- | ------- |
| locationName | string, 1-120 characters                        | Yes      | None    |
| zoneId       | UUID referencing a real delivery zone, nullable | No       | null    |
| feeMinor     | integer >= 0                                    | Yes      | None    |

Use approved operational settings rather than assuming defaults are correct for
launch. Outlet coordinates/radius are metadata; checkout eligibility uses
geofence zones. This file does not create those zones. A non-null settlement
subaccount code must be real and unique across outlets. Omit settlement and
pricing keys when updating catalog content unless changing them intentionally.

## Menu categories -> menu_categories

| Key       | Type / validation             | Required | New-row default |
| --------- | ----------------------------- | -------- | --------------- |
| id        | UUID v4                       | Yes      | None            |
| outletId  | Existing/imported outlet UUID | Yes      | None            |
| name      | string, 2-120 characters      | Yes      | None            |
| sortOrder | integer >= 0; lower first     | No       | 0               |
| isActive  | boolean                       | No       | true            |

Categories belong to a single outlet. Two outlets may each have a Starters
category, but they must have different category IDs.

## Modifier groups -> item_modifier_groups

| Key           | Type / validation        | Required | New-row default |
| ------------- | ------------------------ | -------- | --------------- |
| id            | UUID v4                  | Yes      | None            |
| outletId      | Outlet UUID              | Yes      | None            |
| name          | string, 2-120 characters | Yes      | None            |
| minSelections | integer >= 0             | No       | 0               |
| maxSelections | integer >= 0             | No       | 1               |
| isRequired    | boolean                  | No       | false           |
| sortOrder     | integer >= 0             | No       | 0               |

Importer must validate the final merged values, including existing values on
updates: minSelections <= maxSelections. Require isRequired to equal
(minSelections > 0). For a group assigned to an available item, maxSelections
must be at least 1, and there must be enough available options to satisfy the
minimum. These cross-field rules are importer requirements; the current DTOs
validate individual fields but do not establish all these invariants.

Examples: optional single choice = 0/1/false; required single choice = 1/1/true;
optional up to three extras = 0/3/false.

## Modifiers -> item_modifiers

| Key             | Type / validation                  | Required | New-row default |
| --------------- | ---------------------------------- | -------- | --------------- |
| id              | UUID v4                            | Yes      | None            |
| outletId        | Outlet UUID                        | Yes      | None            |
| groupId         | Modifier group UUID in same outlet | Yes      | None            |
| name            | string, 2-120 characters           | Yes      | None            |
| priceDeltaMinor | signed integer                     | No       | 0               |
| isAvailable     | boolean                            | No       | true            |
| sortOrder       | integer >= 0                       | No       | 0               |

The current API permits negative price deltas. For this first production import,
reject negative deltas unless a separate pricing requirement is agreed; the
example uses only nonnegative extras. Do not silently take an absolute value.

## Menu items -> menu_items

| Key                | Type / validation                          | Required | New-row default            |
| ------------------ | ------------------------------------------ | -------- | -------------------------- |
| id                 | UUID v4                                    | Yes      | None                       |
| outletId           | Outlet UUID                                | Yes      | None                       |
| categoryId         | Category UUID in same outlet               | Yes      | None                       |
| name               | string, 2-160 characters                   | Yes      | None                       |
| priceMinor         | integer >= 0                               | Yes      | None                       |
| modifierGroupIds   | unique UUID v4 array; same outlet          | Yes      | None; use [] for no extras |
| description        | string up to 2000, nullable                | No       | null                       |
| imageUrl           | absolute URL, up to 512, nullable          | No       | null                       |
| deliveryTimeRange  | string up to 60, nullable                  | No       | null                       |
| discountPriceMinor | integer > 0 and < priceMinor, nullable     | No       | null                       |
| discountStartsAt   | ISO 8601 timestamp with timezone, nullable | No       | null                       |
| discountEndsAt     | ISO 8601 timestamp with timezone, nullable | No       | null                       |
| isAvailable        | boolean                                    | No       | true                       |
| sortOrder          | integer >= 0                               | No       | 0                          |

Validate discounts against final values on updates. If both timestamps exist,
end must follow start. For this importer, reject discount dates without a discount
price. To remove a discount, explicitly set price and both dates to null.

modifierGroupIds is not a menu_items database column. For each array entry,
write a menu_item_modifier_groups row containing menuItemId, groupId, and
sortOrder equal to the array index. Generate the link UUID on first insert;
reuse existing links by the unique (menuItemId, groupId) pair on reruns.
Never attach every outlet group to every dish automatically.

## Preparation suggestions -> preparation_suggestions

| Key        | Type / validation        | Required | New-row default |
| ---------- | ------------------------ | -------- | --------------- |
| id         | UUID v4                  | Yes      | None            |
| text       | string, 1-255 characters | Yes      | None            |
| outletId   | Outlet UUID, nullable    | No       | null            |
| menuItemId | Menu item UUID, nullable | No       | null            |
| isActive   | boolean                  | No       | true            |
| sortOrder  | integer >= 0             | No       | 0               |

For this import contract: both IDs null means global; outletId alone means
outlet-scoped; item-scoped records must supply both IDs and they must agree.
This explicit scope rule avoids accidental global suggestions.

## Units and limits

- 450000 means NGN 4,500.00; 150000 means NGN 1,500.00. Never send formatted
  currency strings, decimal naira, or multiply an already-minor price again.
- 750 basis points means 7.5%; this is a unit example, not an approved tax rate.
- Values stored as PostgreSQL integer must be <= 2147483647 (and >= 0 except
  the signed modifier field, whose database minimum is -2147483648).
- Store timestamps as timezone-aware UTC instants. Example:
  `2026-12-01T00:00:00.000Z`. Do not rely on a terminal's local timezone.

## Implementation acceptance criteria

1. Validate the entire file, unknown keys, uniqueness, references, final merged
   field values, and outlet ownership before writing. Report record ID and field
   path for each error. Abort if any error remains.
2. Resolve the target environment explicitly. Check migration state and take a
   restorable backup before the production apply run.
3. Dry run reports inserts, updates, unchanged rows, field differences, and
   removed item/group assignments. It makes zero database changes.
4. Apply in one database transaction, using only transaction-manager repositories:
   outlets -> categories -> modifier groups -> modifiers -> menu items ->
   item/group links -> preparation suggestions. Serialize concurrent imports.
5. Preserve omitted fields and all unrelated data; never truncate tables,
   create demo accounts, reset passwords, or invent settlement codes.
6. Reapplying the same file must make no business-data changes and create no
   duplicates. Do not overwrite production images with null unless explicit.
7. Roll back the full import on failure. Report counts/IDs without credentials.
8. Verify public catalog and item configuration after commit; refresh any relevant
   cached catalog queries or notify clients through the existing realtime path.
9. Test dry-run nonmutation, identical reruns, partial-update preservation,
   cross-outlet rejection, invalid references, link replacement, rollback, and
   concurrent-run exclusion against a test database before production use.

No executable command is specified here because the dedicated importer does not
exist yet. Do not substitute seed:demo or seed:demo:prod: that script creates demo
accounts, changes catalog values, and links every group to every menu item.

## Mapping to existing code

- Field validation: `apps/api/src/catalog/dto/catalog.dto.ts`.
- Defaults and business rules: `apps/api/src/catalog/catalog.service.ts`.
- Persistence: `apps/api/src/outlets/outlet.entity.ts` and catalog entity files.
- Demo script to avoid in production: `apps/api/src/database/seed-demo-data.ts`.

Existing create API DTOs do not accept the import-level id or schemaVersion.
They generate IDs; the importer must preserve supplied IDs via its own validated,
transactional persistence path, or maintain an explicit durable mapping if using
API calls. Do not bypass validation just because TypeORM accepts an object.
The existing API also supplies NGN internally. This proposal changes no API route,
response, migration, or runtime behavior.
