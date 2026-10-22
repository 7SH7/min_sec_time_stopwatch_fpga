# 발표 원고 (슬라이드별 텍스트 + 발표자 노트)

규칙: 슬라이드에는 아래 텍스트를 그대로 쓴다. 임의로 문장을 추가하거나 요약 bullet 을 만들지 않는다.
`[노트]` 는 발표자 노트(speaker notes)로 넣는다. `[그림: xxx]` 는 ppt/assets/xxx.png 를 배치한다.
`{{...}}` 는 발표자가 채워야 하는 자리 (이름, 영상 링크, 실제 캡처). 눈에 띄게 남겨둔다.

---

## 1. 표지
제목: 분초 스톱워치 설계
부제: Basys3 · Verilog · 모드 전환 / circle 애니메이션 / dot 깜박임
하단: {{이름}} · 2026.10.22
[그림: 없음. 7-segment 로 "01.27" 처럼 보이는 숫자 글리프를 크게 배치 (seg_dot.png 의 윗줄 일부를 크롭하거나 도형으로 직접 구성)]

[노트] 지난주 up/down 카운터에 스톱워치 모드를 추가한 과제입니다. 요구사항이 세 가지라서 그 세 가지를 어떻게 풀었는지 순서대로 보겠습니다.

## 2. 과제 요구사항
제목: 과제에서 요구한 것
본문 (표, 3행 2열: 요구사항 / 설계로 옮기면):
- 분초 스톱워치 | FND 4자리에 MM SS. 초 0~59, 분 0~99. 시작/정지/클리어
- 분·초 사이 Dot 가 1초에 1번 깜박임 | 분 1의 자리(an[2]) dp 를 0.5초 ON / 0.5초 OFF
- 일시정지 5초 무입력 → circle 애니메이션, 버튼 누르면 중지 + 해당 기능 수행 | STOP 에서 5초 타이머 → ANIM 상태. ANIM 에서 btnC 는 RUN, btnR 은 클리어
하단 한 줄: "stopwatch mode" 라는 표현 때문에 기존 모드(UP/DOWN/SW_READ) 는 그대로 두고 모드를 하나 추가하는 쪽으로 정했다.

[노트] 과제 문구를 그대로 설계 요구로 바꾼 표입니다. 세 번째 줄의 "해당 기능 수행"이 포인트였는데, 애니메이션 중에 누른 버튼이 단순히 애니메이션만 끄는 게 아니라 원래 기능까지 해야 합니다.

## 3. 보드와 입출력
제목: Basys3 에서 쓰는 핀
본문 (2단: 왼쪽 표, 오른쪽 그림):
표 (신호 / 보드 / 역할):
- clk | W5 | 100 MHz
- reset | btnU | 비동기 리셋 (active-high)
- btn[0] | btnL | 모드 전환
- btn[1] | btnC | 스톱워치 시작 / 정지
- btn[2] | btnR | 스톱워치 클리어
- sw[7:0] | SW0~7 | SW_READ 모드 표시값
- an[3:0], seg[7:0] | FND | 4자리 스캔, seg[7] = dp
- led[15:13] | LED | 현재 모드
[그림: mode_cycle]

[노트] 버튼 배치는 레퍼런스 코드의 btnL 모드 전환을 그대로 두고, 가운데 버튼을 시작/정지, 오른쪽을 클리어로 했습니다. seg 의 최상위 비트가 dp 라서 dot 깜박임은 이 비트 하나로 해결됩니다.

## 4. 구현 - 전체 구조
제목: 블록 다이어그램
[그림: block_diagram (슬라이드 폭 가득)]
하단 캡션 한 줄: 붉은 선이 1 kHz tick. 느린 동작은 전부 이 펄스를 세서 만든다.

[노트] 왼쪽에서 오른쪽으로 신호가 흐릅니다. 버튼은 디바운서를 지나 1클럭 펄스가 되고, tick_generator 가 1kHz 펄스를 만들어서 세 군데로 나눠줍니다. 스톱워치 블록 안에 FSM, BCD 카운터, idle 타이머, 애니메이션 생성기가 들어 있고, display_mux 가 모드별로 FND 에 보낼 숫자를 고릅니다.

## 5. 구현 - 설계에서 지킨 네 가지
제목: 설계 원칙
본문 (2×2 블록. 각 블록: 짧은 제목 + 2~3줄):
(1) 클럭은 하나
모든 플립플롭이 100 MHz clk 로 동작한다. 분주 클럭을 만들지 않고 1 kHz tick 을 enable 로 쓴다. 클럭 도메인이 하나라 타이밍 분석이 단순해진다.
(2) 시간은 tick 에서 파생
10 ms, 100 ms, 0.5 s, 1 s, 5 s 가 전부 tick 을 세는 카운터다. 카운터 폭이 20bit 에서 10~13bit 로 줄고, 테스트벤치에서는 파라미터만 줄이면 된다.
(3) 비동기 입력은 펄스로 바꿔서 전달
버튼은 2단 FF 동기화 → 10 ms 디바운스 → 엣지 검출을 거쳐 1클럭 펄스가 된다. FSM 은 펄스만 본다.
(4) 표시 모듈은 숫자의 의미를 모른다
fnd_controller 는 BCD 4자리, dp 4비트, 애니메이션 패턴만 받는다. 모드별 해석은 display_mux 가 한다.
[그림: tick_hierarchy (오른쪽 또는 아래, (2) 옆)]

[노트] 이 네 가지가 뒤에 나오는 배경 기술 네 가지와 하나씩 연결됩니다. (1)(2) 는 setup/hold 와 glitch, (3) 은 metastability, 그리고 tick 과 reset 처럼 여러 곳으로 가는 신호가 fan-out 입니다.

## 6. 구현 - 스톱워치 FSM
제목: 스톱워치 상태도
[그림: fsm_stopwatch (왼쪽 55%)]
오른쪽 표 (현재 / 조건 / 다음 / 동작):
- STOP | btnC | RUN | 카운트 시작
- STOP | btnR | STOP | 00:00
- STOP | 5초 무입력 | ANIM | 세그먼트 a 부터 회전
- RUN | btnC | STOP | 값 유지
- RUN | btnR | RUN | 무시
- ANIM | btnC | RUN | 애니메이션 중지, 바로 카운트
- ANIM | btnR | STOP | 애니메이션 중지, 00:00
- ANIM | 모드 이탈 | STOP | 애니메이션 중지
- RUN | 모드 이탈 | RUN | 뒤에서 계속 카운트

[노트] 상태는 세 개뿐입니다. 클리어는 상태가 아니라 동작이라서 따로 두지 않았습니다. 다른 모드로 나갔다 와도 RUN 이면 시간은 계속 흐르게 했고, 다른 모드에서 누른 btnC, btnR 은 active 신호로 막아서 스톱워치에 영향이 없습니다.

## 7. 소스 코드 - 버튼 입력 체인
제목: 버튼이 FSM 에 도착하기까지
[그림: input_chain (위쪽 가로로)]
코드 2개 (아래 좌우):
좌: debouncer.v (발췌)
```
(* ASYNC_REG = "TRUE" *) reg btn_meta;
(* ASYNC_REG = "TRUE" *) reg btn_sync;
always @(posedge clk, posedge reset) begin
    if (reset) begin btn_meta <= 0; btn_sync <= 0; end
    else begin btn_meta <= noisy_btn; btn_sync <= btn_meta; end
end
...
if (btn_sync == clean_btn)      r_count <= 0;
else if (r_count < DEBOUNCE_LIMIT) r_count <= r_count + 1;
else begin clean_btn <= btn_sync; r_count <= 0; end
```
우: edge_detector.v
```
reg level_d;
always @(posedge clk, posedge reset)
    if (reset) level_d <= 1'b0;
    else       level_d <= level;

assign pulse = level & ~level_d;
```
캡션: clean_btn 이 레지스터 출력이라 pulse 는 글리치 없이 정확히 1클럭.

[노트] 레퍼런스에서는 main_controller 안에서 이전 버튼값을 기억해서 엣지를 잡았는데, 그걸 밖으로 빼서 모듈로 만들었습니다. 덕분에 FSM 코드에서 버튼 관련 잡음이 사라졌고 테스트벤치에서도 펄스 하나로 전이를 확인할 수 있습니다.

## 8. 소스 코드 - 시간 카운터
제목: BCD 로 직접 세는 MM:SS
코드 (왼쪽 60%):
```
else if (state == S_RUN && tick) begin
    if (ms_cnt == TICKS_PER_SEC - 1) begin
        ms_cnt <= 0;                 // 랩과 초 증가가 같은 클럭
        if (sec_ones == 4'd9) begin
            sec_ones <= 4'd0;
            if (sec_tens == 4'd5) begin   // 59초 → 00초
                sec_tens <= 4'd0;
                if (min_ones == 4'd9) begin
                    min_ones <= 4'd0;
                    min_tens <= (min_tens == 4'd9) ? 4'd0 : min_tens + 4'd1;
                end
                else min_ones <= min_ones + 4'd1;
            end
            else sec_tens <= sec_tens + 4'd1;
        end
        else sec_ones <= sec_ones + 4'd1;
    end
    else ms_cnt <= ms_cnt + 1'b1;
end
```
오른쪽 설명 (3줄):
- 자리마다 9→0, 5→0 을 직접 처리한다. 2진수로 세고 나누는 방식과 달리 표시 쪽에 나눗셈 회로가 없다.
- dot 는 같은 카운터에서 나온다: RUN 일 때 ms_cnt < 500 이면 켜짐.
- 99:59 다음은 00:00.
코드 (오른쪽 하단, 작게):
```
assign dot = (state == S_RUN) ? (ms_cnt < TICKS_PER_SEC/2)
           : (state == S_STOP);
```

[노트] dot 를 별도 0.5초 카운터로 만들지 않고 ms_cnt 의 전반/후반으로 만들었습니다. 그래서 초가 바뀌는 순간과 dot 가 켜지는 순간이 항상 같습니다. 정지 중에는 켜진 채로 두어서 정지 상태를 눈으로 알 수 있게 했습니다.

## 9. 소스 코드 - idle 타이머와 애니메이션
제목: 5초 무입력 판정과 circle 회전
코드 좌:
```
wire any_pulse = btn_run | btn_clear | btn_other;
wire idle_done = active && (state == S_STOP) && tick
              && !any_pulse && (idle_cnt == IDLE_TICKS - 1);

always @(posedge clk, posedge reset)
    if (reset)                                   idle_cnt <= 0;
    else if (state != S_STOP || !active || any_pulse) idle_cnt <= 0;
    else if (tick) idle_cnt <= (idle_cnt == IDLE_TICKS-1) ? 0 : idle_cnt + 1;
```
코드 우:
```
else if (state != S_ANIM) begin
    anim_cnt <= 0;  anim_idx <= 3'd0;   // 진입 시 항상 a 부터
end
else if (tick) begin
    if (anim_cnt == ANIM_STEP_TICKS - 1) begin
        anim_cnt <= 0;
        anim_idx <= (anim_idx == 3'd5) ? 3'd0 : anim_idx + 3'd1;
    end
    else anim_cnt <= anim_cnt + 1'b1;
end
assign anim_seg = 7'b000_0001 << anim_idx;   // idx 0~5 → g 는 안 켜짐
```
[그림: seg_dot (아래 가로로, 높이 작게)]

[노트] idle 타이머는 STOP 이고 스톱워치 모드일 때만 셉니다. 어떤 버튼이든 오면 0 으로 돌아가고, 타임아웃과 버튼이 같은 클럭에 오면 버튼이 이깁니다. 애니메이션 인덱스는 0~5 만 돌기 때문에 가운데 g 세그먼트는 구조적으로 켜질 수 없습니다.

## 10. 테스트벤치 전략
제목: 시뮬레이션을 수 ms 안에 끝내는 방법
본문 상단 2줄:
모든 시간 상수를 파라미터로 빼서 테스트벤치에서 줄였다. 실제 보드 값과 시뮬 값의 비율만 다르고 로직은 같다.
각 TB 는 check 태스크로 PASS/FAIL 을 스스로 판정하고 마지막에 `=== tb_xxx: N errors ===` 를 찍는다.
표 (TB / 대상 / 축소 파라미터 / 확인 항목):
- tb_debouncer | debouncer + edge_detector | LIMIT 999,999 → 20 | 채터링 제거, 펄스 폭 1클럭, 지연 LIMIT+3
- tb_tick_generator | tick_generator | 100,000 → 10 | 주기, 펄스 폭
- tb_stopwatch | stopwatch | 1초=10 tick, idle 2초, anim 2 tick | 59→00, 99:59→00:00, STOP→ANIM→RUN, dot, clear
- tb_fnd_controller | fnd_controller | tick 직접 인가 | an 순서, 디코드, dp 위치, anim override
- tb_top_stopwatch | 전체 | 디바운스 20, tick 10클럭 | 모드 순환, 시작/정지/클리어 전체 흐름
하단: {{Vivado xsim 콘솔 캡처: "=== tb_stopwatch: 0 errors ===" 가 보이는 화면}}

[노트] 100MHz 로 5초를 그대로 시뮬하면 5억 사이클이라 현실적이지 않습니다. 파라미터만 줄이면 같은 코드로 1ms 안에 끝납니다. 이게 처음부터 tick 기반으로 설계한 이유 중 하나입니다.

## 11. 타이밍 차트 1 - 초 증가와 dot
제목: ms_cnt 랩과 sec_ones 증가는 같은 엣지
[그림: wave_sec_dot (가득)]
캡션: tick 이 들어온 클럭에서 ms_cnt 가 999→0 이 되고 같은 엣지에 sec_ones 가 +1. dot 는 ms_cnt < 500 구간에서만 1.
{{실제 xsim 파형 캡처로 교체}}

[노트] 비블로킹 대입이라 같은 always 블록 안에서 ms_cnt 리셋과 sec_ones 증가가 같은 엣지에 반영됩니다. 파형에서 두 신호가 같은 세로선에서 바뀌는 걸 확인하는 게 포인트입니다.

## 12. 타이밍 차트 2 - 버튼 체인
제목: noisy_btn 에서 pulse 까지
[그림: wave_button_chain (가득)]
캡션: 채터링 구간에서는 r_count 가 0 으로 되돌아가고, LIMIT 클럭 안정된 뒤 clean_btn 이 바뀐다. pulse 는 그 엣지에서 1클럭.
{{실제 xsim 파형 캡처로 교체}}

[노트] 동기화 2클럭 + 카운터 LIMIT 클럭 + 1 클럭, 그래서 지연이 LIMIT+3 입니다. 테스트벤치에서 이 숫자를 정확히 체크합니다.

## 13. 타이밍 차트 3 - STOP → ANIM → RUN
제목: 5초 타임아웃과 애니메이션 회전
[그림: wave_anim (가득)]
캡션: idle_cnt 가 4999 에서 tick 을 받는 클럭에 state 가 ANIM 으로. anim_seg 는 100 ms 마다 01→02→04→08→10→20. btn_run 펄스에 바로 RUN.
{{실제 xsim 파형 캡처로 교체}}

[노트] 애니메이션 중에 버튼을 누르면 "애니메이션 중지 후 기능 수행"인데, 상태 전이 한 번으로 둘 다 됩니다. ANIM 을 벗어나는 순간 anim_en 이 0 이 되고 RUN 이 시작됩니다.

## 14. 동작 동영상
제목: 보드 동작
본문: 큰 영상 자리 {{동영상 삽입 또는 링크/QR}}
오른쪽 체크리스트 (영상에서 보여줄 순서):
1. btnL 4번 → led[15:13] = 100
2. btnC → 카운트 시작, dot 깜박임
3. btnC → 정지, dot 켜진 채 유지
4. 5초 대기 → 바깥 테두리 회전
5. btnC → 애니메이션 중지, 바로 재개
6. btnR (정지 중) → 00.00

[노트] 영상은 이 순서대로 찍으면 요구사항 세 가지가 전부 한 번에 보입니다.

## 15. 트러블슈팅
제목: 막혔던 것과 고친 것
본문 (표: 문제 / 원인 / 조치):
- 레퍼런스 top 이 합성되지 않음 | top 이 부르는 btn_debouncer(3비트) 가 파일에 없고, main_controller 에 없는 tick 포트를 연결 | btn_debouncer 를 generate 로 신설, 포트 정리
- 모드가 가끔 두 칸씩 넘어감 (레퍼런스) | r_mode 에 블로킹 대입, 이전 버튼값 갱신이 reset 분기 밖 | 엣지 검출을 별도 모듈로, 모든 순차 블록을 비블로킹 + reset 분기 안으로
- 시뮬과 합성 결과가 다를 수 있는 코드 | always @(r_mode), always @(bcd_data) 같은 불완전 감도리스트 | 전부 always @(*)
- LED 비트 겹침 | led[15:13] 이 모드인데 카운터를 led[13:0] 에 쓰려 함 | 카운터는 led[12:0]
- 초 중간에 정지 후 클리어하면 재시작이 빨라질 가능성 | ms_cnt 를 클리어에서 안 지우면 남은 값만큼 먼저 초가 올라감 | 클리어에서 ms_cnt 도 0, TB 에 케이스 추가
하단 한 줄: 리셋(btnU) 해제 동기화와 bin2bcd 경로 타이밍은 아직 확인 못 했다. Timing Summary 의 WNS 를 보고 판단할 예정.

[노트] 마지막 줄은 솔직하게 남겼습니다. 리셋 해제를 동기화하지 않으면 FF 마다 리셋이 풀리는 사이클이 다를 수 있다는 건 다음 장 metastability 와 연결됩니다.

## 16. 구현 후기
제목: 하고 나서 남은 것
본문 (문단 3개, bullet 아님):
설계 문서를 먼저 쓰고 코드를 나중에 썼다. 모듈 포트와 FSM 표를 문서에서 확정하고 나니 코드는 옮겨 적는 일에 가까웠고, 테스트벤치도 표를 보고 그대로 만들 수 있었다.
tick 하나로 모든 시간을 만드는 구조는 처음엔 돌아가는 길처럼 보였는데, 테스트벤치를 쓸 때 가장 득을 봤다. 파라미터 하나 바꾸면 5초가 20 tick 이 된다.
아쉬운 점은 시뮬레이터 없는 환경에서 코드를 먼저 썼다는 것. 리뷰로 사이클 수까지 맞춰봤지만 결국 파형을 보기 전까지는 확신할 수 없었다. {{Vivado 결과 반영 후 이 문단 수정}}

[노트] 면접에서 "왜 이렇게 설계했나"를 물으면 이 장의 첫 두 문단이 답입니다.

## 17. 섹션 표지
제목: Background
부제: setup / hold time · Metastability · Glitch · Fan-out
한 줄: 이 설계의 어느 줄과 연결되는지와 함께

## 18. Setup / Hold time
제목: Setup / Hold time
[그림: setup_hold (왼쪽 60%)]
오른쪽 텍스트:
개념 — 클럭 엣지 앞뒤로 데이터가 안정되어 있어야 하는 최소 시간. 앞이 setup, 뒤가 hold.
원인·문제 — 조합 로직 지연이 길거나 클럭 주기가 짧으면 setup 위반, 경로가 너무 빠르거나 클럭 스큐가 크면 hold 위반. 위반하면 FF 가 어떤 값을 잡을지 알 수 없다.
해결 — 주기 늘리기, 경로 쪼개기(파이프라인), 스큐 줄이기. 이 설계에서는 분주 클럭을 안 쓰고 단일 클럭 + enable 로 두어 툴이 모든 경로를 한 클럭 기준으로 검사하게 했다.
수식 한 줄 (이미지에 포함되어 있으면 생략)

[노트] Vivado 의 Timing Summary 에서 WNS 가 setup 여유, WHS 가 hold 여유입니다. 이 설계에서 가장 긴 경로는 bin2bcd 의 나눗셈 체인일 것으로 예상합니다.

## 19. Metastability
제목: Metastability
[그림: metastability (왼쪽 60%)]
오른쪽 텍스트:
원인 — setup/hold 를 지킬 수 없는 입력, 즉 비동기 입력(버튼, 다른 클럭 도메인 신호)이 엣지 근처에서 바뀌면 FF 출력이 0 도 1 도 아닌 상태에 머물렀다가 임의의 시점에 정해진다.
해결 — 2단 FF 동기화기. 첫 FF 가 준안정이어도 한 클럭 동안 안정될 시간을 주고 두 번째 FF 가 받는다. 완전히 없애는 게 아니라 MTBF 를 실용적으로 충분히 늘리는 것.
이 설계 — debouncer.v 의 btn_meta, btn_sync. ASYNC_REG 속성으로 두 FF 를 같은 슬라이스에 배치하도록 툴에 알린다. 리셋(btnU) 은 아직 동기화하지 않았다.

[노트] 디바운스는 채터링 문제고 동기화는 준안정 문제입니다. 둘은 다른 문제인데 같은 모듈에 들어 있어서 헷갈리기 쉽습니다.

## 20. Glitch
제목: Glitch
[그림: glitch (왼쪽 60%)]
오른쪽 텍스트:
정의 — 조합 로직 출력이 최종값에 도달하기 전에 잠깐 튀는 것. 입력 하나가 여러 경로로 갈라져 지연이 다를 때 생긴다(hazard).
문제 — 그 출력을 클럭이나 비동기 리셋, 또는 외부 핀으로 쓰면 튄 펄스가 실제 동작이 된다.
해결 — 조합 출력을 FF 로 받아서 클럭 엣지에서만 샘플링. 조합 로직 출력을 클럭으로 쓰지 않는다.
이 설계 — fnd_controller 의 an/seg 를 출력 FF 로 받았다. tick 을 클럭이 아니라 enable 으로 쓴 것도 같은 이유.

[노트] 레퍼런스처럼 분주한 신호를 다른 always 의 클럭으로 쓰면 그 신호의 글리치가 곧 클럭 엣지가 됩니다. enable 로 쓰면 글리치가 있어도 다음 엣지에서 한 번 샘플링될 뿐입니다.

## 21. Fan-out
제목: Fan-out
[그림: fanout (왼쪽 60%)]
오른쪽 텍스트:
정의 — 하나의 출력이 구동하는 입력의 개수.
문제 — 부하 커패시턴스가 커져 상승/하강이 느려지고 지연이 늘어 setup 위반으로 이어진다. 전압 레벨도 나빠질 수 있다.
해결 — 버퍼 트리, 레지스터 복제(같은 값을 가진 FF 를 여러 개 두어 부하 분산). 클럭은 전용 글로벌 버퍼(BUFG) 로 보낸다. Vivado 는 합성 시 fan-out 한도를 넘으면 자동 복제한다.
이 설계 — tick, reset, state 가 fan-out 이 큰 신호. 100 MHz 에서는 여유가 있지만 리포트의 High Fanout Nets 를 확인할 항목.

[노트] 비동기 리셋은 모든 FF 로 가기 때문에 보통 가장 fan-out 이 큰 넷입니다.

## 22. 마무리
제목: 정리
본문 (3줄):
요구사항 세 가지는 FSM 상태 하나(ANIM), 카운터 비교 하나(ms_cnt < 500), 모드 하나 추가로 풀었다.
설계 원칙은 단일 클럭 + tick enable, 입력은 펄스로, 표시는 분리. 이 셋이 setup/hold, metastability, glitch, fan-out 과 각각 닿아 있다.
남은 일: Vivado 파형 캡처, Timing Summary 확인, 리셋 동기화.
하단: 코드와 문서 — github.com/7SH7/min_sec_time_stopwatch_fpga

[노트] 질문 받겠습니다.
