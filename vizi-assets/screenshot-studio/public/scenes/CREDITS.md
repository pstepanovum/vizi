# Scene photo credits

These are the placeholder photos shown inside the mocked camera frame. They are
**not committed** — run `npm run scenes` to download them (see
`scripts/fetch-scenes.mjs`, which holds the canonical ID list).

All five are from [Unsplash](https://unsplash.com) under the
[Unsplash License](https://unsplash.com/license): free to use for commercial and
non-commercial purposes, no permission needed, no attribution required
(attribution appreciated). The license does **not** cover using the photos to
build a competing photo service, and it does not grant rights to trademarks,
logos, or people's likeness that happen to appear in a photo.

| File | Subject | Photographer | Unsplash photo ID |
| --- | --- | --- | --- |
| `street.jpg` | People crossing a city street in the rain | Andréa Villiers | `photo-1663232041381-1dc25ccfc0ad` |
| `kitchen.jpg` | Modern white kitchen with a marble island | Jason Briscoe | `photo-1556911220-bff31c812dba` |
| `menu.jpg` | Coffee shop menu board with drink names and prices | Haberdoedas | `photo-1777372403658-34d3d7644485` |
| `clothes.jpg` | Colorful patterned clothes hanging on a rack | Haberdoedas | `photo-1775740397180-e8f9a540135d` |
| `clothes-rack.jpg` | A rack with a bunch of clothes hanging on it | Bennie Bates | `photo-1729864210127-0c0dc835dd78` |

Every file is fetched as `https://images.unsplash.com/<id>?w=1000&h=1500&fit=crop&crop=entropy&q=80&fm=jpg`.

## Before you ship these to the App Store

The Unsplash License is permissive, but store screenshots are marketing
material, so check each image again before submitting:

- **No third-party trademarks or logos.** A brand name on a packet, a menu
  board, or a shopfront can get a submission rejected or draw a complaint. The
  current `menu.jpg` was chosen because the drink names are generic; re-check it
  if you swap the image.
- **No recognisable faces.** The Unsplash License does not grant model releases.
  The people in `street.jpg` and `clothes.jpg` are small and turned away — keep
  it that way, or use imagery we shot ourselves.
- **Nothing that misrepresents the app.** Whatever is in the frame has to be
  something Vizi could plausibly be looking at and describing.

If any of that is uncertain, shoot our own photos and drop them into this folder;
the dashboard picks up any file listed in `SCENES` in `src/config.ts` and
`scripts/fetch-scenes.mjs`.
