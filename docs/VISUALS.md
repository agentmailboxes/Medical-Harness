# Browser verification

Screenshots are generated from synthetic responses by `npm run test:browser`. Desktop is 1440 × 1000; mobile is 390 × 844. Both themes use reduced-motion mode. Startup tests delay the app module to verify the home screen is present before initialization and no anatomy code/assets are requested.

| View | Light | Dark |
| --- | --- | --- |
| Desktop home | ![Desktop light](media/desktop-light.png) | ![Desktop dark](media/desktop-dark.png) |
| Mobile home | ![Mobile light](media/mobile-light.png) | ![Mobile dark](media/mobile-dark.png) |
| Desktop anatomy | ![Desktop anatomy light](media/anatomy-desktop-light.png) | ![Desktop anatomy dark](media/anatomy-desktop-dark.png) |
| Mobile anatomy | ![Mobile anatomy light](media/anatomy-mobile-light.png) | ![Mobile anatomy dark](media/anatomy-mobile-dark.png) |

Tests also cover graphics failure with searchable fallback, older-answer context, new-question reset, and discarded unreviewed chunks. The outdated walkthrough recording was removed.
