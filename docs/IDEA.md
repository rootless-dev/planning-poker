# Realtime Planning Poker

## Overview

The idea of the project is to develop a web-based Planning Poker application focused on real-time collaboration for agile teams.

The main goal is to allow distributed teams to estimate tasks in a simple, fast, intuitive, and visually pleasant way.

The application will be centered around:

- realtime experience
- low latency
- simplicity
- fast room sharing

Initially, the project will focus on:

- development speed
- modern UX
- realtime interactions
- operational simplicity
- low infrastructure cost

The initial architecture will be based on a SPA frontend using Vue.js + Firebase.

---

# Product Goals

- Create rooms quickly
- Share sessions through links
- Allow synchronized real-time voting
- Make the estimation process more fun and fluid
- Work well on desktop and mobile
- Require no installation
- Avoid mandatory sign-up initially

---

# Main Flow

## Home `/`

Application landing page.

Responsibilities:

- present the product
- quickly explain how it works
- allow quick room creation
- show the app benefits
- allow joining an existing session

Possible elements:

- hero section
- "Create Room" button
- lightweight animations
- visual voting preview
- FAQ
- Planning Poker explanation
- dark mode support

---

## Session Creation `/session`

Screen where the user configures the session.

Possible configurations:

- room name
- moderator name
- scoring system
- allow spectators
- automatic or manual vote reveal
- optional timer
- user limit
- anonymous mode
- room visual theme

Scoring systems:

- Fibonacci
- T-shirt sizing
- Custom sequence
- Free numeric values

Example:

- 0
- 1
- 2
- 3
- 5
- 8
- 13
- 21
- ?
- ☕
- Skip

---

## Realtime Session `/session/:uuid`

Main application experience.

Responsibilities:

- player joining
- realtime synchronization
- voting
- card reveal
- session management

---

# Important Features

## Realtime

Every interaction should happen in real time:

- users joining/leaving
- card selection
- vote reveal
- settings changes
- round switching

Initial technology:

- Firebase Firestore Realtime

---

## Online Presence

The system should indicate:

- online users
- disconnected users
- reconnecting users
- current moderator

Possible indicators:

- avatar
- status dot
- presence animations

---

## Voting System

Each player:

- selects a card
- cannot see other votes before reveal
- can change the vote before reveal

The moderator can:

- reveal votes
- reset round
- start a new round

---

## Vote Reveal

After all players vote:

- moderator reveals votes
- collective reveal animation
- visual display of results

Possible data:

- average
- vote divergence
- highest vote
- lowest vote

---

## Round History

The room can store:

- voting history
- timestamps
- participants
- final selected result

Example:
| Round | Task | Result |
|---|---|---|
| 1 | Login API | 5 |
| 2 | OAuth Integration | 8 |

---

## Quick Sharing

Each room will have:

- unique URL
- copy link button
- optional QR Code

Example:
`/session/550e8400-e29b-41d4-a716-446655440000`

---

## Temporary Profiles

Initially:

- users join with only a name

Future support:

- Google login
- GitHub login
- custom avatars
- session history

---

# Future Features

## Jira Integration

Possibility to:

- import tasks
- vote directly
- sync estimations

---

## Trello Integration

- import cards
- navigate between tasks

---

## Scrum Master Mode

Special features:

- session control
- kick users
- lock voting
- pause session
- control timer

---

## Session Chat

Realtime side chat:

- quick messages
- estimation discussions
- emojis/reactions

---

## Round Timer

Each round can have:

- countdown timer
- sound alerts
- optional auto reveal

---

## Statistics

Session dashboard:

- average voting time
- vote distribution
- team history
- participant divergence

---

## Spectator Mode

Users can join as:

- spectators
- non-voting participants

Useful for:

- training
- presentations
- onboarding

---

# Technical Requirements

## Frontend

Initial stack:

- Vue 3
- Vite
- TypeScript
- Pinia
- Vue Router
- TailwindCSS

---

## Backend / Infrastructure

Initially:

- Firebase Authentication
- Firebase Firestore
- Firebase Hosting

Possible future evolution:

- dedicated backend
- analytics
- custom API
- custom websocket layer

---

# Initial Architecture

```text
Frontend SPA (Vue)
        ↓
Firebase SDK
        ↓
Firestore Realtime
```

- Pinia
- Vue Router
- TailwindCSS

---

## Backend / Infrastructure

Initially:

- Firebase Authentication
- Firebase Firestore
- Firebase Hosting

Possible future evolution:

- dedicated backend
- analytics
- custom API
- custom websocket layer

---

# Initial Architecture

```text
Frontend SPA (Vue)
        ↓
Firebase SDK
        ↓
Firestore Realtime
