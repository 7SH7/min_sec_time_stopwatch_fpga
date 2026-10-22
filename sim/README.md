# 시뮬레이션 실행 방법 (Vivado xsim)

## 1. 프로젝트 구성
1. Vivado 에서 새 RTL 프로젝트 생성 (보드: Basys3 / 파트 `xc7a35tcpg236-1`).
2. **Design Sources** 에 `src/*.v` 전체 추가.
3. **Simulation Sources** 에 `sim/tb_*.v` 전체 추가 (Add Sources → "Add or create simulation sources").
4. **Constraints** 에 `constraints/Basys3.xdc` 추가 (시뮬레이션에는 불필요, 합성/구현용).

## 2. 테스트벤치 실행
1. Sources 창 → Simulation Sources → 실행할 TB 우클릭 → **Set as Top**.
2. Flow Navigator → **Run Simulation → Run Behavioral Simulation**.
3. 기본 실행 시간(1000ns)에서 멈추므로 툴바의 **Run All** (또는 Tcl 콘솔에서 `run all`) 실행.
   각 TB 는 끝에서 `$finish` 하므로 자동으로 멈춘다.
4. Tcl Console 에서 결과 확인:
   - 항목별 `PASS: ...` / `FAIL: ...`
   - 마지막 줄 `=== tb_xxx: N errors ===` → **N = 0 이면 통과**

| TB | 대상 | 축소 파라미터 | 대략 시뮬 시간 |
|----|------|---------------|----------------|
| `tb_debouncer` | debouncer + edge_detector | DEBOUNCE_LIMIT=20 | ~10 µs |
| `tb_tick_generator` | tick_generator | TICK_COUNT=10 | ~2 µs |
| `tb_stopwatch` | stopwatch | 1초=10 tick, idle 2초, anim 2 tick | ~1.3 ms |
| `tb_fnd_controller` | fnd_controller | tick 을 TB 가 직접 인가 | ~1 µs |
| `tb_top_stopwatch` | top_stopwatch 전체 | 디바운스 20, tick=10클럭 | ~50 µs |

## 3. 타이밍 차트용 파형 포인트
Scope 창에서 신호를 Wave 로 드래그해서 확인한다 (Radix 는 BCD/카운터를 Unsigned Decimal 로).

1. **tick 1클럭 폭** — `tb_tick_generator`: `clk`, `tick`.
   tick 이 TICK_COUNT(10) 클럭마다 정확히 1클럭만 High.
2. **btn → clean_btn → btn_pulse 지연** — `tb_debouncer`: `noisy_btn`, `u_debouncer/btn_meta`,
   `u_debouncer/btn_sync`, `u_debouncer/r_count`, `clean_btn`, `pulse`.
   채터링 동안 `r_count` 가 0 으로 되돌아가고, 안정 후 약 LIMIT+3 클럭 뒤 `clean_btn` 상승, 같은 클럭에 `pulse` 1클럭.
   (통합 파형은 `tb_top_stopwatch` 의 `dut/btn`, `dut/u_btn_debouncer/g_btn[1]/w_clean`, `dut/w_btn_pulse`)
3. **ms_cnt 랩과 sec_ones 증가 동시성** — `tb_stopwatch`: `tick`, `u_stopwatch/ms_cnt`, `sec_ones`, `sec_tens`.
   `ms_cnt` 가 9→0 되는 같은 클럭 엣지에서 `sec_ones` 가 +1 (59초 → 01:00 자리올림 구간도 확인).
4. **dot 토글** — `tb_stopwatch`: `u_stopwatch/ms_cnt`, `dot`, `state`.
   RUN 에서 `ms_cnt < 5` 동안 1, 이후 0 → 1초 주기. STOP 에서 항상 1, ANIM 에서 0.
5. **STOP → ANIM → RUN 전이와 anim_seg 회전** — `tb_stopwatch`: `state`, `u_stopwatch/idle_cnt`,
   `anim_en`, `anim_seg`, `btn_run`.
   `idle_cnt` 가 19 에서 tick 을 받는 순간 state 0→2, `anim_seg` 가 2 tick 마다 01→02→04→08→10→20→01 (bit6 = g 는 항상 0),
   `btn_run` 펄스에서 state 2→1.
