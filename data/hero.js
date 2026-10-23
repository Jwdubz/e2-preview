/* Hero as data. One composite film fills the first screen (>=1001 px: "wide", three vertical panels in one 1920x1080 file, 7.0 s loop;
   phone/tablet: "tall", one 9:16 film). Words sit in a thin caption band inside the last ~6.6% of the viewport, never over a tint.
   payoffAt = seconds into the loop when the finished piece first reads; the last word lands payoffAt + 0.25 s. Words land once, then stay.
   Sources (all E² own media, from /workspace/audit-staging/e2studios/footage):
     wide L  ig_DcrBhpcpvsi 3.4-10.4 (P7, stencil press, peel, reveal; 1080x1920 cropped 1080x1822)
     wide C  fb_1524991611931065 0.5-7.5 (P10, forearm sleeve linework to colour; 1080x1440 cropped 853x1440)
     wide R  ig_DcrBhpcpvsi 29.2-33.4 (P8, glove wipe) | fb_1335105981793244 12.0-14.8 (P6, payoff at 4.2 s)
     tall    ig_DcrBhpcpvsi 3.4-6.2 | 29.2-31.7 | 34.0-37.3 (900x1600)
   Not on the page: P11 (fb_1866592334030440, third-party anime linework), P12 (ig_DXX8Alxj-fE, audience-restricted), P2 (fb_1374368964050770, Uzumaki by Junji Ito reference art, same third-party IP problem as P11: dropped from the hero this round), P5. See MEDIA_FLAGS. */
window.HERO_CLIPS = [
  {
    id: "studio-triptych",
    wide: {
      src: "media/hero-wide.mp4", poster: "media/hero-wide-poster.jpg", payoffAt: 4.2,
      source: "composite of P7 / P10 / P8+P6 (see comment)",
      words: [ { t: 0.5, text: "One Leaf." }, { t: 2.3, text: "One Hand." }, { t: "payoff", text: "Yours." } ]
    },
    tall: {
      src: "media/hero-phone.mp4", poster: "media/hero-phone-poster.jpg", source: "ig_DcrBhpcpvsi 3.4-6.2 / 29.2-31.7 / 34.0-37.3 (900x1600)",
      payoffAt: 5.3,
      words: [ { t: 0.5, text: "One Leaf." }, { t: 2.9, text: "One Hand." }, { t: "payoff", text: "Yours." } ]
    }
  }
];
/* Footage that is not safe for a public or sent link. All OFF the page; kept here as the record. */
window.MEDIA_FLAGS = {
  "P11 fb_1866592334030440": "THIRD-PARTY / PRIVATE PREVIEW ONLY (anime linework, not E² own media). Not on the page.",
  "P12 ig_DXX8Alxj-fE": "AUDIENCE-RESTRICTED (signed-in Instagram). Not on the page.",
  "P2 fb_1374368964050770": "THIRD-PARTY IP (Uzumaki by Junji Ito reference art tattooed). Dropped from the hero in round 3. Not on the page.",
  "P5 ig_DXF_hvNDsoK": "CONTAINS-CLIENT-NAME / PRIVATE PREVIEW ONLY. Not on the page."
};
