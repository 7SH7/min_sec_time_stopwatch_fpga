# Diagram manifest

Rebuild everything from `ppt/`: `node diagrams/build.js` (or `node diagrams/build.js <stem> ...`).
Sources: `diagrams/src/<stem>.js` (SVG generators, shared style in `src/lib.js`) → `diagrams/<stem>.svg` → `assets/<stem>.png`. The build trims the white border, adds a uniform 2.5% margin and scales to 3000 px on the long side.

Type sizes (v2): every label ≥ 24 px per 1500 px of content width (block titles / state names 32–34 px); input_chain, setup_hold, metastability, glitch, fanout use ≥ 28 px and are stacked (concept above, fix below) at ~1.5:1.
Waveforms: `diagrams/wave_*.json` are WaveDrom-format specs (signal / wave / data / node); they are drawn by the in-house renderer `timing()` in `src/lib.js` so they share the deck's stroke, font and colour rules. They also open in the stock WaveDrom editor if needed.

Style: white background, #222 2px strokes, one red accent #C8102E per diagram, grey #8A8F98 for clocks / secondary.

| file | px | shows | slide topic | red accent |
|---|---|---|---|---|
| assets/block_diagram.png | 3000×1861 | top_stopwatch: btn_debouncer, tick_generator, mode_controller, up_down_counter, stopwatch (FSM / BCD / idle / anim), display_mux, fnd_controller, led 선택; all signal names | 전체 구조 (Block Diagram) | `tick` net fanning out to up_down_counter, stopwatch, fnd_controller |
| assets/fsm_stopwatch.png | 3000×2714 | STOP / RUN / ANIM FSM, transitions, self-loops, per-state outputs | 스톱워치 FSM | STOP→ANIM (idle 5초) |
| assets/mode_cycle.png | 3000×806 | IDLE→UP→DOWN→SW_READ→STOPWATCH→UP, led[15:13] codes, FND and led[12:0] per mode | 모드 전환 | STOPWATCH box |
| assets/tick_hierarchy.png | 3000×1459 | clk ÷100,000 → tick → ×1/×10/×100/×500/×1000/×5000 with consumers | 단일 클럭 + tick enable | tick box |
| assets/input_chain.png | 3000×1946 | noisy_btn → FF btn_meta → FF btn_sync → r_count → clean_btn → level_d FF + AND → pulse | 버튼 입력 처리 (동기화·디바운스·엣지) | "비동기 입력" bracket |
| assets/wave_sec_dot.png | 3000×1202 | clk, tick, ms_cnt 997..2, sec_ones 3→4, dot | 타이밍: 초 증가와 dot | "같은 클럭 엣지" line at the 999→0 wrap |
| assets/wave_button_chain.png | 3000×1306 | noisy_btn chatter, btn_meta, btn_sync, r_count, clean_btn, pulse (LIMIT=4) | 타이밍: 디바운스 | r_count reset by chatter |
| assets/wave_anim.png | 3000×1245 | tick, idle_cnt 4998/4999/0, state STOP→ANIM→RUN, anim_en, anim_seg 01..20,01, btn_run, dot | 타이밍: idle → 애니메이션 → RUN | 5000번째 tick → ANIM edge |
| assets/seg_dot.png | 3000×1761 | "01.27" on 4 digits with dp at an[2]; labelled a–g/dp digit; anim row with only b lit; idx→seg table | FND 표시 / dp / 애니메이션 패턴 | dp dot |
| assets/setup_hold.png | 3000×1902 | D-FF, setup/hold window, 3 D cases, t_su/t_h/t_cq, setup & hold inequalities | Setup / Hold | D transition inside the window + unknown Q |
| assets/metastability.png | 3000×1866 | Q hovering at mid level then resolving; 2-FF synchronizer; debouncer.v btn_meta/btn_sync | Metastability | hovering Q |
| assets/glitch.png | 3000×1818 | Y = A·A' hazard with inverter delay, waveforms; fix = output FF; fnd_controller note | Glitch | glitch pulse |
| assets/fanout.png | 3000×2040 | 1 driver → 8 loads, slow edge; buffer tree 1→2→4→8; register duplication; BUFG; tick/reset/state note | Fan-out | heavily loaded net + slow edge |
