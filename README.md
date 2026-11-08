# Quill

## Overview

An zero knowledge encryption privacy-focused social journaling app. Create a diary, invite friends, and journal together.

## Screenshots

|                                       Diaries                                       |                                      Calendar                                      |                                       Entry List                                       |                                          Entry                                          |                                      Dark Mode                                       |
| :---------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------: |
| <img src="assets/images/screenshots/01-diaries.jpg" width="150" alt="Diary list" /> | <img src="assets/images/screenshots/04-calendar.jpg" width="150" alt="Calendar" /> | <img src="assets/images/screenshots/05-entry-list.jpg" width="150" alt="Entry list" /> | <img src="assets/images/screenshots/02-entry.jpg" width="150" alt="Entry with photo" /> | <img src="assets/images/screenshots/03-dark-mode.jpg" width="150" alt="Dark mode" /> |

## Features

- **Multiple diaries**: Organize your thoughts with separate diaries which are encrypted and saved into your local database
- **Calendar**: Jump to any date and quickly add an entry with a tap
- **Rich Entries**: Bring your journals to life with beautiful text formatting, photos, videos and voice recordings
- **Accounts**: Sign up and add your own profile picture
- **Polished experience**: Haptic feedback, dark mode, and a clean design you will enjoy writing in
- **Shared Diaries**: Get invited by friends or invite them, and have a safe space to write and view each other's thoughts.
- **Different Views**: See your entries in many views: list, gallery, timeline and more.
- **More customization options**: Change the diary's color and more. We love customization and you do too.
- **Built-in applock**: Lock the app with biometrics or a custom app PIN.
- **Encrypted sync**: Your shared diaries' entries will be synced to a database using end-to-end encryption, so only you and your friends can read them.

## Upcoming Features

These features are planned but not yet implemented.

- **Notifications**: Get a notification every day to remember to keep the streak.

The diagram below shows the planned design for encrypted syncing once this feature is implemented:

```mermaid
flowchart LR
    subgraph C1["Client 1"]
        C1db[(Local DB)]
        C1keys["Private key + Public key"]
    end

    subgraph BE["Backend (Supabase)"]
        BEkeys[(Public key directory)]
        BEwrapped[(Wrapped diary keys)]
        BEdata[(Ciphertext store)]
    end

    subgraph C2["Client 2"]
        C2db[(Local DB)]
        C2keys["Private key + Public key"]
    end

    C1keys -->|register public key| BEkeys
    C2keys -->|register public key| BEkeys

    BEkeys -->|fetch member's public key| C1keys

    C1keys -->|wrap diary key with member's public key| BEwrapped
    BEwrapped -->|download wrapped diary key| C2keys

    C1db -->|encrypt entry with diary key, upload| BEdata
    C2db -->|encrypt entry with diary key, upload| BEdata

    BEdata -->|download, decrypt with diary key| C1db
    BEdata -->|download, decrypt with diary key| C2db
```

## Tech Stack

- **React Native + Expo**
- **Expo Router** — used for navigation between screens
- **React Native Libsodium** - used for cryptography
- **TypeScript**
- **Local database**: SQLite via `expo-sqlite`
- **Backend**: Supabase
- **Rich text editor**: `10tap-editor` — used for implementing the editor
- **React Native Reanimated and Gesture Handler**: Used to make smooth animation and gesture-based interactions

---

Created with :heart: by NiceSapien, AmrGamalbit, and Crewshon!

