# PLL — Parakeet Labz Language

**PLL** stands for **Parakeet Labz Language**. It is FlockBuilder's own
scripting language: a tiny, friendly language for giving your game objects
behavior — no programming experience needed.

Every **Actor** you place in FlockBuilder Studio runs on PLL. There are two
ways to write it, and they are two views of the exact same rules:

- **PLL Visual** — pick WHEN and THEN from dropdowns (great for starting out).
- **PLL Code** — type the rules as text (faster once you know the language).

Anything you build in one view shows up in the other.

## How to use it

1. Open FlockBuilder Studio and place an **Actor** (blue, gear badge).
2. Click it, then look at the **Properties** panel on the right.
3. Click the **PLL Code** tab.
4. Type your rules, one per line, then click **Apply PLL**.
5. If something is wrong, PLL tells you the exact line and what's wrong.
   Fix it and apply again. Press **▶ Play** to try it.

## The shape of a rule

Every rule looks like this:

```
when <trigger> then <action>
```

- The **trigger** is the *when* — the event you are reacting to.
- The **action** is the *then* — what happens.
- One rule per line. Lines starting with `#` are comments, ignored by PLL.

A first script:

```
# Bounce forever, and give the player 5 points when touched
when timer 1.5 then jump 700
when touch player then score 5
when touch player then destroy self
when destroyed then sound coin
```

## Triggers

| Trigger | Syntax | Example | Notes |
|---|---|---|---|
| On game start | `when start` | `when start then say "Go!"` | Fires once when the room begins |
| Touches the player | `when touch player` | `when touch player then destroy self` | Fires every frame while touching |
| Key is pressed | `when key <key>` | `when key E then shoot right 600` | Fires on the press, not while held |
| Every few seconds | `when timer <seconds>` | `when timer 2 then jump 700` | Repeats forever |
| Score reaches | `when score <n>` | `when score 10 then win` | Fires once when the score first reaches n |
| When destroyed | `when destroyed` | `when destroyed then fx poof` | Fires when this actor is destroyed — great for chain reactions |

Key names: single letters work as-is (`E`, `Q`), plus `Space`, `Up`,
`Down`, `Left`, `Right` for the arrows. (Anything else is treated as a raw
keyboard code, e.g. `ShiftLeft`.)

## Actions

| Action | Syntax | Example |
|---|---|---|
| Move | `then move <direction> <speed>` | `then move toward 200` |
| Jump | `then jump <power>` | `then jump 700` |
| Shoot | `then shoot <direction> <speed>` | `then shoot right 600` |
| Destroy itself | `then destroy self` | `then destroy self` |
| Add score | `then score <n>` | `then score 5` |
| Play a sound | `then sound <name>` | `then sound coin` |
| Win the game | `then win` | `then win` |
| Lose the game | `then lose` | `then lose` |
| Show a message | `then say "<text>"` | `then say "Ouch!"` |
| Teleport | `then teleport <x> <y>` | `then teleport 700 100` |
| Spawn something | `then spawn <coin/enemy>` | `then spawn enemy` |
| Play a particle effect | `then fx <name>` | `then fx poof` |

Directions: `left`, `right`, `up`, `down`, `toward` (toward the player),
`away` (away from the player).

Sounds: `blip`, `jump`, `coin`, `hit`, `powerup`, `boing`.

`say` text can be quoted (`say "Hello!"`) or plain (`say hello`) — quotes
are only needed if you want leading/trailing spaces kept exactly.

## Putting it together

A patrolling turret that shoots at you:

```
when timer 2 then shoot toward 350
```

A coin that talks, then vanishes with sparkles:

```
when touch player then say "Shiny!"
when touch player then score 1
when touch player then destroy self
when destroyed then fx poof
```

A "collect 10 to win" rule (put it on any actor):

```
when score 10 then win
```

A springy blob (this is the sample game's blob):

```
when timer 1.6 then jump 750
when touch player then score 5
when touch player then destroy self
when destroyed then sound coin
```

## Tips

- Rules run **top to bottom, every frame**. Put the most important ones first.
- `when touch player` fires continuously while touching — pair it with
  `destroy self` for one-shot pickups.
- `when score` fires **once** per threshold, so `when score 10 then spawn enemy`
  spawns exactly one enemy.
- Bullets fly straight, pop on walls, defeat red enemies, and hurt the player —
  but they can't hit whoever fired them for the first split second.
- Landing on top of a red enemy **stomps** it (+1 score and a bounce).
  Touching one from the side still hurts.
- Touch a purple **checkpoint** flag and you'll respawn there if you fall,
  with two seconds of mercy blinking.
- Made a typo? The error box tells you the line number — PLL is picky about
  spelling, but it always tells you what it expected.

Have fun — and if you invent a cool actor, save it to the **Prefab Library**
so you can stamp it into every game you make.
