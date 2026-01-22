# workflow_sessions API Documentation

This documentation provides details on how to interact with the `workflow_sessions` collection using the PocketBase JavaScript SDK and the REST API.

**Base URL**: `https://test.turing99.online`

## List/Search

Fetch a paginated list of `workflow_sessions` records. Supports sorting and filtering.

### JavaScript SDK

```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://test.turing99.online');

// Fetch a paginated records list
const resultList = await pb.collection('workflow_sessions').getList(1, 50, {
    filter: 'status = "running"',
    sort: '-created',
});

// Fetch all records at once via getFullList
const records = await pb.collection('workflow_sessions').getFullList({
    sort: '-created',
});

// Fetch only the first record that matches the specified filter
const record = await pb.collection('workflow_sessions').getFirstListItem('title ~ "test"', {
    expand: 'user',
});
```

### API Details

**GET** `/api/collections/workflow_sessions/records`

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `page` | Number | The page (offset) of the list (default 1). |
| `perPage` | Number | Max returned records per page (default 30). |
| `sort` | String | Sort order (e.g. `-created,id`). Supported fields: `id`, `title`, `status`, `currentStepId`, `created`. |
| `filter` | String | Filter expression (e.g. `status='completed'`). |
| `expand` | String | Auto expand record relations (e.g. `user`). |
| `fields` | String | Comma separated fields to return. |

### Response Example

```json
{
  "page": 1,
  "perPage": 30,
  "totalPages": 1,
  "totalItems": 2,
  "items": [
    {
      "id": "RECORD_ID",
      "collectionId": "pbc_3436149272",
      "collectionName": "workflow_sessions",
      "title": "My New Workflow",
      "status": "idle",
      "currentStepId": "topic-discovery",
      "steps": [ ... ],
      "context": { ... },
      "user": "USER_ID",
      "created": "2026-01-01 10:00:00.000Z",
      "updated": "2026-01-01 10:00:00.000Z"
    }
  ]
}
```

---

## View

Fetch a single `workflow_sessions` record.

### JavaScript SDK

```javascript
const record = await pb.collection('workflow_sessions').getOne('RECORD_ID', {
    expand: 'user',
});
```

### API Details

**GET** `/api/collections/workflow_sessions/records/:id`

### Response Example

```json
{
  "id": "RECORD_ID",
  "collectionId": "pbc_3436149272",
  "collectionName": "workflow_sessions",
  "title": "My New Workflow",
  "status": "idle",
  "currentStepId": "topic-discovery",
  "steps": [ ... ],
  "context": { ... },
  "user": "USER_ID",
  "created": "2026-01-01 10:00:00.000Z",
  "updated": "2026-01-01 10:00:00.000Z"
}
```

---

## Create

Create a new `workflow_sessions` record.

### JavaScript SDK

```javascript
const data = {
    "title": "New Session",
    "status": "idle",
    "currentStepId": "topic-discovery",
    "steps": [], // Initial steps JSON
    "context": {},
    "user": "USER_ID"
};

const record = await pb.collection('workflow_sessions').create(data);
```

### API Details

**POST** `/api/collections/workflow_sessions/records`

### Body Parameters

| Field | Type | Description |
| :--- | :--- | :--- |
| `title` | String | **Required**. The title of the workflow session. |
| `status` | String | **Required**. `idle`, `running`, `waiting`, `completed`, `failed`. |
| `currentStepId` | String | **Required**. The ID of the current step. |
| `steps` | JSON | **Required**. Array of step objects. |
| `context` | JSON | Optional. Workflow context data. |
| `user` | String | **Required**. The ID of the owner user. |

---

## Update

Update a single `workflow_sessions` record.

### JavaScript SDK

```javascript
const data = {
    "status": "running",
    "context": { "topic": "AI" }
};

const record = await pb.collection('workflow_sessions').update('RECORD_ID', data);
```

### API Details

**PATCH** `/api/collections/workflow_sessions/records/:id`

---

## Delete

Delete a single `workflow_sessions` record.

### JavaScript SDK

```javascript
await pb.collection('workflow_sessions').delete('RECORD_ID');
```

### API Details

**DELETE** `/api/collections/workflow_sessions/records/:id`

---

## Realtime

Subscribe to realtime changes via Server-Sent Events (SSE).

### JavaScript SDK

```javascript
// Subscribe to all changes in workflow_sessions
pb.collection('workflow_sessions').subscribe('*', function (e) {
    console.log(e.action); // create, update, delete
    console.log(e.record);
});

// Unsubscribe
pb.collection('workflow_sessions').unsubscribe('*');
```

### API Details

**SSE** `/api/realtime`

---

## Batch

Batch create/update/delete records.

### JavaScript SDK

```javascript
const batch = pb.createBatch();

batch.collection('workflow_sessions').create({ ... });
batch.collection('workflow_sessions').update('RECORD_ID', { ... });
batch.collection('workflow_sessions').delete('RECORD_ID');

const result = await batch.send();
```

### API Details

**POST** `/api/batch`
