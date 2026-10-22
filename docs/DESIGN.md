# 분초 스톱워치 (Basys3) 설계 문서

작성일: 2026-10-22
기반 코드: `refre/` (이전 과제: up/down 카운터 + 슬라이드 스위치 읽기)

---

## 0. 요구사항 (과제 문구 → 설계 요구로 변환)

| # | 과제 문구 | 설계 요구 |
|---|-----------|-----------|
| R1 | 분초시계 stopwatch | FND 4자리에 `MM SS` 표시. 초 0~59, 분 0~99. 시작/정지/클리어 |
| R2 | 분과 초 사이의 Dot를 1초에 1번씩 깜박임 | 분 1의 자리(digit 2, `an[2]`)의 dp를 0.5초 ON / 0.5초 OFF (주기 1초) |
| R3 | 일시정지 상태에서 5초간 무입력이면 circle 애니메이션 | STOP 상태에서 5초 타이머 만료 → ANIM 상태. 4자리 모두 a→b→c→d→e→f 세그먼트가 100ms 간격으로 회전 |
| R4 | 애니메이션 중 동작 버튼을 누르면 애니메이션 중지 + 해당 기능 수행 | ANIM 상태에서 btnC → RUN, btnR → 클리어 후 STOP, btnL → 모드 전환(스톱워치 화면 이탈) |
| R5 | "stopwatch mode" | 기존 모드(UP/DOWN/SW_READ)에 STOPWATCH 모드를 추가. btnL로 순환 |

---

## 1. 보드 / 핀 / 버튼 배정

- 보드: Digilent **Basys3** (Artix-7), 시스템 클럭 100 MHz (`W5`)
- `reset` : **btnU** (active-high, 비동기 리셋)
- `btn[0]` : **btnL** → 모드 전환
- `btn[1]` : **btnC** → 스톱워치 시작 / 정지 (토글)
- `btn[2]` : **btnR** → 스톱워치 클리어 (00 00)
- `sw[7:0]` : 슬라이드 스위치 (SW_READ 모드에서 표시)
- `an[3:0]` : FND 자리 선택 (active-low, `an[3]`=천의 자리 … `an[0]`=일의 자리)
- `seg[7:0]` : `{dp, g, f, e, d, c, b, a}` (active-low)
- `led[15:0]` : `led[15:13]` = 현재 모드, 나머지는 모드별 데이터

### 모드 순환 (btnL 누를 때마다)

```
IDLE(0) → UP(1) → DOWN(2) → SW_READ(3) → STOPWATCH(4) → UP(1) → ...
```
(레퍼런스와 동일하게 IDLE은 리셋 직후에만 존재하고, 순환 중에는 다시 돌아오지 않음)

| mode | led[15:13] | FND 표시 | led[12:0] |
|------|-----------|----------|-----------|
| IDLE | 000 | 0000 | 0 |
| UP | 001 | 10ms 업카운터 0000~9999 | 카운터 값 |
| DOWN | 010 | 10ms 다운카운터 9999~0000 | 카운터 값 |
| SW_READ | 011 | sw[7:0] 10진 표시 (0~255) | sw |
| STOPWATCH | 100 | `MM SS` + dp | stopwatch 상태 (led[1:0]) |

---

## 2. Block Diagram

```
                 ┌──────────────────────────────────────────────────────────────────┐
                 │ top_stopwatch                                                    │
 btn[2:0] ──────►│ btn_debouncer ──► btn_pulse[2:0] (1클럭 폭 rising-edge 펄스)        │
                 │  (debouncer×3 + edge_detector×3)       │                        │
                 │                                        ▼                        │
 clk ───────────►│ tick_generator ──► tick_1khz ───► mode_controller ──► mode[2:0] │
 reset ─────────►│  (100MHz → 1kHz 1클럭 펄스)       │          (btnL 로 순환)        │
                 │                                   │                             │
                 │                                   ├──► up_down_counter ──► cnt[13:0]
                 │                                   │      (10ms 마다 ±1, mode 에 따라)
                 │                                   │
                 │                                   └──► stopwatch ─────► min_t,min_o,sec_t,sec_o (BCD×4)
                 │                                          │             dot (dp)
                 │                                          │             anim_en, anim_seg[6:0]
                 │                                          │             sw_state[1:0]
                 │                                          │
                 │   display_mux (mode 에 따라 BCD 4자리 / dp / anim 선택) ◄─ cnt, sw, stopwatch 출력
                 │                      │
                 │                      ▼
                 │   fnd_controller (1ms 다이내믹 스캔 + 7seg 디코더 + dp + anim override) ──► an, seg
                 └──────────────────────────────────────────────────────────────────┘
```

핵심 원칙 (면접 설명 포인트):
1. **단일 클럭 도메인**: 모든 플립플롭은 100 MHz `clk` 하나로만 동작. 느린 동작은 클럭을 분주하지 않고 **enable 펄스(tick)** 로 만든다. → 클럭 스큐/글리치/타이밍 분석 문제가 생기지 않는다.
2. **tick 계층**: `tick_1khz`(1ms) 하나에서 10ms(업다운), 100ms(애니메이션 스텝), 500ms(dot), 1s(초), 5s(idle)를 전부 카운터로 파생.
3. **비동기 입력은 반드시 동기화 후 사용**: 버튼 → 2단 FF 동기화 → 디바운스(10ms 안정) → 엣지 검출(1클럭 펄스). FSM은 펄스만 본다.
4. **표시 계층 분리**: `fnd_controller`는 "숫자의 의미"를 모른다. BCD 4자리 + dp 4비트 + 애니메이션 패턴만 받는다.

---

## 3. 모듈 명세

### 3.1 `debouncer` (refre 그대로 재사용, 파라미터만 노출)
```verilog
module debouncer #(parameter DEBOUNCE_LIMIT = 999_999) (  // 100MHz × 10ms
    input clk, input reset, input noisy_btn, output reg clean_btn);
```
- 2단 FF 동기화 (`ASYNC_REG` 속성) → 입력이 `clean_btn`과 다른 상태로 `DEBOUNCE_LIMIT` 클럭 유지되면 반영.

### 3.2 `edge_detector`
```verilog
module edge_detector (input clk, input reset, input level, output pulse);  // rising edge → 1클럭 펄스
```
- `pulse = level & ~level_d`.

### 3.3 `btn_debouncer` (레퍼런스 top 이 호출하던 이름, 실제로는 없던 모듈을 신설)
```verilog
module btn_debouncer #(parameter DEBOUNCE_LIMIT = 999_999) (
    input clk, input reset, input [2:0] noisy_btn, output [2:0] btn_pulse);
```
- `generate` 로 debouncer + edge_detector 3쌍.

### 3.4 `tick_generator` (refre 그대로)
```verilog
module tick_generator #(parameter INPUT_FREQ = 100_000_000, parameter TICK_HZ = 1000) (
    input clk, input reset, output reg tick);   // 1kHz, 1클럭 폭
```

### 3.5 `mode_controller`
```verilog
module mode_controller (
    input clk, input reset, input btn_mode_pulse, output reg [2:0] mode);
localparam IDLE=3'd0, UP=3'd1, DOWN=3'd2, SW_READ=3'd3, STOPWATCH=3'd4;
```
- 펄스마다 `IDLE/STOPWATCH → UP`, 그 외 `+1`.

### 3.6 `up_down_counter` (refre main_controller 의 카운터 부분을 분리·정리)
```verilog
module up_down_counter #(parameter TICKS_PER_STEP = 10) (   // 1kHz tick × 10 = 10ms
    input clk, input reset, input tick, input en_up, input en_down, output reg [13:0] count);
```
- `en_up` 이면 10ms 마다 +1 (9999→0), `en_down` 이면 −1 (0→9999). 둘 다 0이면 유지.
- 레퍼런스는 100MHz 를 직접 1,000,000 세었지만, 여기서는 1kHz tick 을 10번 세는 것으로 통일.

### 3.7 `stopwatch` (이번 과제의 핵심)
```verilog
module stopwatch #(
    parameter TICKS_PER_SEC   = 1000,   // 1kHz tick 기준 1초
    parameter IDLE_TIMEOUT_S  = 5,      // 애니메이션 진입까지 초
    parameter ANIM_STEP_TICKS = 100     // 애니메이션 한 스텝 100ms
)(
    input clk, input reset, input tick,
    input active,          // mode == STOPWATCH 일 때 1
    input btn_run,         // btnC 펄스
    input btn_clear,       // btnR 펄스
    input btn_other,       // btnL 펄스 (idle 타이머 리셋용)
    output [3:0] min_tens, min_ones, sec_tens, sec_ones,
    output dot,            // 분/초 사이 dp (1=켜짐)
    output anim_en,        // 1이면 FND는 anim_seg 를 표시
    output [6:0] anim_seg, // {g,f,e,d,c,b,a} active-high
    output [1:0] state     // 디버그/LED 용
);
```

#### 내부 구성
- `ms_cnt` (0~999): RUN 상태에서 tick 마다 +1, 999→0 일 때 `sec_pulse`.
- `sec_ones/sec_tens/min_ones/min_tens` : BCD 카운터 체인 (0~9 / 0~5 / 0~9 / 0~9). 99:59 → 00:00 랩어라운드.
- `dot` : RUN 이면 `ms_cnt < 500` (초가 시작되는 전반 0.5초 켜짐, 후반 꺼짐 → 1초에 1번 깜박). STOP 이면 항상 켜짐(정지 표시). ANIM 이면 꺼짐.
- `idle_cnt` : STOP 상태이고 `active` 일 때 tick 마다 +1. 버튼 펄스(run/clear/other)가 오면 0. `IDLE_TIMEOUT_S × TICKS_PER_SEC` 도달 → ANIM.
- `anim_cnt` / `anim_idx` (0~5): ANIM 상태에서 tick 을 `ANIM_STEP_TICKS` 번 셀 때마다 `anim_idx+1` (5→0). `anim_seg = 7'b1 << anim_idx` (a→b→c→d→e→f).

#### FSM
```
                 btn_run                     btn_run
      ┌────────────────────────► RUN ◄─────────────────────┐
      │                           │                         │
      │                           │ btn_run                 │
      ▼                           ▼                         │
    STOP ◄──────────────────── STOP                        │
   (리셋 상태)                     │ idle_cnt == 5s (active)  │
      ▲                           ▼                         │
      │  btn_clear / !active     ANIM ──────────────────────┘
      └────────────────────────── │
            (클리어: 카운터 0)       └── btn_other(btnL): active 가 0 이 되므로 STOP 복귀
```

| 현재 | 조건 | 다음 | 동작 |
|------|------|------|------|
| STOP | `btn_run` | RUN | 카운트 시작 |
| STOP | `btn_clear` | STOP | 카운터·ms_cnt 0 |
| STOP | `idle_cnt == IDLE_TIMEOUT && active` | ANIM | anim_idx 0 부터 |
| RUN  | `btn_run` | STOP | 카운트 정지(값 유지), idle_cnt 0 |
| RUN  | `btn_clear` | RUN | 무시 (정지 상태에서만 클리어 가능) |
| ANIM | `btn_run` | RUN | 애니메이션 중지 후 바로 카운트 재개 |
| ANIM | `btn_clear` | STOP | 애니메이션 중지 + 카운터 0 |
| ANIM | `!active` (btnL 로 모드 이탈) | STOP | 애니메이션 중지 |
| RUN  | `!active` | RUN | **계속 카운트** (다른 모드 보다가 돌아와도 시간은 흐름) |

- 버튼 입력(`btn_run`, `btn_clear`)은 `active` 와 AND 해서 사용 → 다른 모드에서 btnC/btnR 을 눌러도 스톱워치에 영향 없음.

### 3.8 `display_mux`
```verilog
module display_mux (
    input [2:0] mode, input [13:0] count, input [7:0] sw,
    input [3:0] sw_min_t, sw_min_o, sw_sec_t, sw_sec_o, input sw_dot, input sw_anim_en, input [6:0] sw_anim_seg,
    output reg [3:0] d1000, d100, d10, d1, output reg [3:0] dp, output reg anim_en, output reg [6:0] anim_seg);
```
- UP/DOWN: `bin2bcd(count)`, dp=0. SW_READ: `bin2bcd({6'b0, sw})`. STOPWATCH: BCD 직결, `dp = {1'b0, sw_dot, 1'b0, 1'b0}` (digit2 = `an[2]` = 분 1의 자리). IDLE: 0000.
- `bin2bcd4digit` 는 refre 의 `/`, `%` 버전을 함수 또는 모듈로 재사용 (합성 가능, 14bit 라 자원 문제 없음).

### 3.9 `fnd_controller` (refre 확장)
```verilog
module fnd_controller (
    input clk, input reset, input tick,
    input [3:0] d1000, d100, d10, d1, input [3:0] dp,
    input anim_en, input [6:0] anim_seg,
    output reg [3:0] an, output reg [7:0] seg);
```
- `fnd_digit_select`: tick 마다 `sel` 0→1→2→3 (1ms 스캔, 4ms 주기 = 250Hz 리프레시).
- `anim_en == 0`: `seg = {~dp[sel], seg7_decode(bcd[sel])}` (active-low 변환).
- `anim_en == 1`: `seg = {1'b1, ~anim_seg}` 를 4자리 모두에 동일 출력.
- 레퍼런스의 `always @(bcd_data)` 등 불완전 감도리스트는 모두 `always @(*)` 로 교체.

### 3.10 `top_stopwatch`
- 위 모듈 배선. `led[15:13] = mode`, `led[1:0] = sw_state` (STOPWATCH 모드일 때), UP/DOWN 일 때 `led[12:0] = count[12:0]` (bit13 은 모드 표시와 겹치므로 제외), SW_READ 일 때 `led[7:0] = sw`.

---

## 4. 타이밍 상수 요약

| 이름 | 값 (100MHz 기준) | 파생 방법 |
|------|------------------|-----------|
| tick_1khz | 100,000 clk | tick_generator |
| 디바운스 | 1,000,000 clk (10ms) | debouncer |
| 업다운 스텝 | 10 tick (10ms) | up_down_counter |
| FND 스캔 | 1 tick / 자리 | fnd_digit_select |
| dot 토글 | 500 tick | stopwatch.ms_cnt |
| 1초 | 1000 tick | stopwatch.ms_cnt |
| idle → ANIM | 5000 tick | stopwatch.idle_cnt |
| anim 스텝 | 100 tick | stopwatch.anim_cnt |

---

## 5. 테스트벤치 계획 (Vivado xsim 에서 실행, 로컬 시뮬레이터 없음)

모든 TB 는 **파라미터를 작게 override** 해서 수 ms 시뮬레이션으로 끝나게 하고, `$display` 로 PASS/FAIL 을 자가 판정한다.

| TB | 대상 | 검증 항목 |
|----|------|-----------|
| `tb_debouncer.v` | debouncer + edge_detector | 채터링 입력이 걸러지고, 안정 후 1클럭 펄스 1개만 나오는지 |
| `tb_tick_generator.v` | tick_generator | 주기 = TICK_COUNT, 펄스 폭 = 1클럭 |
| `tb_stopwatch.v` | stopwatch (TICKS_PER_SEC=10, IDLE_TIMEOUT_S=2, ANIM_STEP_TICKS=2) | run→초 증가, 59→00 자리올림, stop 유지, clear, idle 타임아웃→ANIM, ANIM 중 btn_run→RUN, dot 0.5초 토글, active=0 시 버튼 무시 |
| `tb_fnd_controller.v` | fnd_controller | an 스캔 순서, seg 디코드, dp 위치, anim override |
| `tb_top_stopwatch.v` | top (디바운스 한도 작게) | 모드 순환, STOPWATCH 모드에서 start/stop/clear 흐름 전체 |

타이밍 차트에 넣을 포인트: (1) `tick` 1클럭 폭, (2) `btn → clean_btn → btn_pulse` 지연, (3) `ms_cnt` 999→0 과 `sec_ones` 증가 동시성, (4) `dot` 토글, (5) `state` STOP→ANIM→RUN 전이와 `anim_seg` 회전.

---

## 6. 코딩 규칙 (구현 에이전트용)

- Verilog-2001. `timescale 1ns/1ps`.
- 순차 블록: `always @(posedge clk, posedge reset)`, active-high 비동기 리셋, **모든 reg 를 reset 분기에서 초기화**, 비블로킹(`<=`)만 사용. reset 분기 바깥에 문장 두지 않기.
- 조합 블록: `always @(*)`, 블로킹(`=`)만, 모든 경로에서 모든 출력 대입(래치 금지), `case` 에 `default` 필수.
- 상태/모드 인코딩은 `localparam`. 레지스터 선언 시 초기값(`reg x = 0`) 사용하지 않음(리셋으로 통일).
- 하나의 reg 는 하나의 always 블록에서만 구동.
- 모듈 1개 = 파일 1개 (`src/<module>.v`), 테스트벤치는 `sim/tb_<module>.v`. 예외: `fnd_controller.v` 는 레퍼런스처럼 보조 모듈(`fnd_digit_select`, `fnd_digit_display`)을 같은 파일에 둔다.
- 주석은 한국어로, "왜" 를 적는다 (면접 설명용).

---

## 7. 구현 중 확정된 세부 사항 (구현 → 리뷰 후 반영, 2026-10-22)

- **FND 출력 레지스터**: `fnd_controller` 의 `an`/`seg` 는 FF 를 한 번 거쳐 나간다 (리셋 시 전부 OFF). 조합 로직 글리치가 핀으로 나가지 않도록. 1클럭(10ns) 지연은 표시에 영향 없음.
- **idle 타이머 리셋 조건**: 버튼 펄스 3종 + `state != STOP` + `active == 0`. 다른 모드에 갔다 돌아오면 5초를 처음부터 다시 센다.
- **같은 클럭 우선순위**: idle 타임아웃과 버튼 펄스가 같은 클럭이면 버튼 우선. STOP 에서 `btn_run` 이 `btn_clear` 보다 우선. ANIM 에서는 `btn_run` → (`btn_clear` 또는 `!active`) 순.
- **`btn_other`(btnL) 는 `active` 로 게이팅하지 않음**: idle 타이머 리셋 전용. ANIM 탈출은 다음 클럭에 `active` 가 0 이 되면서 일어남.
- **업다운 스텝 카운터**: `en_up`/`en_down` 둘 다 0 이면 값을 유지(리셋하지 않음). 둘 다 1 이면 `en_up` 우선.
- **bin2bcd 변환기 공유**: `display_mux` 에 변환기 1개만 두고 입력을 `count` / `{6'b0, sw}` 로 선택.
- **XDC false path**: 입력(reset/btn/sw)과 출력(an/seg/led)에 `set_false_path` 선언.

### 알려진 개선 여지 (리뷰 지적, 미적용)
- 리셋(btnU)이 동기화 없이 모든 FF 의 비동기 리셋으로 직결됨. 리셋 해제가 클럭 엣지 근처면 FF 마다 다른 사이클에 풀릴 수 있다. 제품 설계라면 2단 FF 리셋 동기화기(reset synchronizer)로 해제 시점을 맞춘다. → PPT "Metastability" 항목에서 언급하기 좋은 소재.
- `bin2bcd4digit` 의 14bit `/`, `%` 체인 → `fnd_digit_display` → 출력 FF 경로가 10ns 안에 못 들어올 가능성. Vivado Timing Summary 의 WNS 가 음수면 BCD 출력을 레지스터로 한 번 받거나 `set_multicycle_path` 를 건다. 입력이 10ms 마다 바뀌므로 설령 위반해도 눈에 보이진 않음.
