# TEFABIGN — REQUIREMENTS

## Product

**Name:** ጠፋብኝ (Tefabign)

**Descriptor:** University Campus Lost & Found System

## Product Idea

A university-focused system that makes it easy for students/staff to report lost or found property, discover possible matches, prove ownership, receive authorized staff decisions, and track an item through return and case closure.

## Original Academic Requirements

The supplied project document describes:
- lost-item reporting;
- found-item reporting;
- searching/viewing reports;
- matching lost and found items;
- ownership verification;
- authorized staff review;
- approval/rejection of claims;
- notifications;
- status tracking;
- return confirmation;
- case closure.

## Implementation Improvements

The implementation additionally adopts:
- simple student-first flows;
- private ownership evidence;
- controlled/private found-item images;
- match suggestions;
- chain-of-custody history;
- campus-aware locations;
- shareable report references;
- privacy-preserving communication;
- human-readable statuses.

These improvements are product decisions, not claims about what the original academic PDF required.

## Core Roles

### Student/Staff User
Can:
- report lost item;
- report found item when permitted;
- search public-safe reports;
- view own cases;
- submit claims;
- provide ownership evidence;
- receive notifications.

### Authorized Staff
Can:
- review reports;
- review possible matches;
- inspect claims/evidence;
- approve/reject;
- manage handover/return;
- close cases;
- inspect audit history.

## Core Workflow

```text
Report Lost / Report Found
          ↓
     Search / Matching
          ↓
   Possible Match
          ↓
        Claim
          ↓
 Ownership Verification
          ↓
     Staff Review
       ↙      ↘
   Reject     Approve
                 ↓
             Handover
                 ↓
          Return Confirmed
                 ↓
             Case Closed
```

## Product Principles

1. Easy for students.
2. Secure for owners.
3. Useful for staff.
4. Matching assists; humans decide.
5. Private evidence remains private.
6. Every important case action is auditable.
