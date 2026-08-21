# GridHabits

Cross-platform habit tracker with a GitHub-style contribution grid. Check off small daily habits (medicine, vitamins, teeth) and watch the year fill in.

## Stack

- Expo SDK 57 + React Native + TypeScript
- Expo Router (file-based routes in `src/app`)
- NativeWind v4 (Tailwind) + a dark GitHub-inspired theme
- Async Storage for offline habits and daily logs

## Project structure

```text
gridhabits/
├── app.json
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── nativewind-env.d.ts
├── assets/
└── src/
    ├── app/
    │   ├── _layout.tsx          # Dark theme, HabitsProvider, stack
    │   └── index.tsx            # Heatmap + today's checklist
    ├── components/
    │   ├── HabitHeatmap.tsx     # 52-week × 7-day grid
    │   ├── HabitRow.tsx         # One-tap complete row
    │   └── HabitFormModal.tsx   # Create / edit habits
    ├── context/
    │   └── HabitsProvider.tsx   # State + persistence
    ├── storage/
    │   └── habitStorage.ts      # AsyncStorage load/save
    ├── types/
    │   └── index.ts             # Habit, HabitLog
    ├── constants/
    │   └── theme.ts
    └── utils/
        ├── dates.ts
        ├── heatmap.ts           # Ratios, colors, 52-week builder
        └── ids.ts
```

## Data model

```ts
interface Habit {
  id: string;
  name: string;
  category: string;
  targetDailyCount: number;
  color: string;
  icon: string;
  createdAt: string;
  isActive: boolean;
}

interface HabitLog {
  habitId: string;
  date: string; // YYYY-MM-DD
  count: number;
}
```

Each heatmap cell is the average completion of all **active** habits that day (`count / targetDailyCount`). 0% is gray; 100% is the vivid accent green.

## Run it

Node.js **20.19.4+** is required for Expo SDK 57.

```bash
npm install
npx expo start
```

Then open iOS Simulator, Android emulator, or Expo Go.

## Usage

- Tap a habit to increment today's count. At the daily target, the next tap clears it.
- Long-press a habit to edit color, icon, category, or times per day.
- Tap a heatmap cell to inspect that day and backfill missed check-ins.
- First launch seeds Medicine, Vitamins, and Teeth (twice daily).
