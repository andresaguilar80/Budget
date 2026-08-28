# Functional Specification: Vacation Request System (MVP)

## Project Overview
The MVP (Minimum Viable Product) for the vacation request system focuses on a simplified request and decision model. The primary goal is to ensure traceability and accountability while avoiding the complexity of a full-scale HR platform.

## Core Requirements

### 1. Core Functionalities
- **Employee Features**:
    - Submit vacation requests.
    - Track request status (Draft, Submitted, Approved, Rejected, Cancelled).
- **Manager Features**:
    - Review and decide on employee requests.
    - Log decisions to ensure clear accountability.

### 2. Business Rules & Structure
- **Request Lifecycle**: A request must support the following states:
    - `Draft`
    - `Submitted`
    - `Approved`
    - `Rejected`
    - `Cancelled`
- **Integrity**: Once a request is submitted, it cannot be edited.
- **Accountability**: The system must record the final state, the manager responsible for the decision, and any accompanying comments.

### 3. Out of Scope
- Any features not strictly necessary to demonstrate the end-to-end decision flow.
- Full HR management features beyond the scope of the MVP.

## Technical Specifications
- **Database**: SQLite (Local file).
- **Front-end**: React / Next.js.
- **Back-end**: Minimal API.

## Data Model (4 Core Tables)
The data model is designed to be extremely simple:

- **Employees**: Manages user records, login, and logout functionality.
    - *Security Requirement*: Passwords must be stored using **hashing**; plain-text passwords are strictly prohibited.
- **Access Type**: Defines permission levels within the system (e.g., distinguishing between a regular employee and a manager).
- **Request**: The core of the vacation process.
    - Tracks the request lifecycle (Draft, Submitted, Approved, Rejected, Cancelled).
    - Records validated dates.
    - Prevents modification once the status is "Submitted".
- **Approval**: Stores the history of manager decisions.
    - Captures the final state, the manager responsible for the decision, and any accompanying comments.
