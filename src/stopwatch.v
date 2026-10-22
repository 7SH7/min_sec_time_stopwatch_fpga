`timescale 1ns / 1ps

// 분초 스톱워치 (MM:SS, 00:00 ~ 99:59)
// - 상태: STOP(리셋 상태) / RUN / ANIM(정지 후 무입력 IDLE_TIMEOUT_S 초 → circle 애니메이션)
// - 모든 시간은 1kHz tick 을 세어 파생 (ms_cnt, idle_cnt, anim_cnt) → 단일 클럭 도메인 유지
module stopwatch #(
    parameter TICKS_PER_SEC   = 1000,   // 1kHz tick 기준 1초
    parameter IDLE_TIMEOUT_S  = 5,      // 애니메이션 진입까지 초
    parameter ANIM_STEP_TICKS = 100     // 애니메이션 한 스텝 100ms
)(
    input            clk,
    input            reset,
    input            tick,
    input            active,       // mode == STOPWATCH 일 때 1
    input            btn_run,      // btnC 펄스
    input            btn_clear,    // btnR 펄스
    input            btn_other,    // btnL 펄스 (idle 타이머 리셋용)
    output reg [3:0] min_tens,
    output reg [3:0] min_ones,
    output reg [3:0] sec_tens,
    output reg [3:0] sec_ones,
    output           dot,          // 분/초 사이 dp (1=켜짐)
    output           anim_en,      // 1이면 FND 는 anim_seg 를 표시
    output     [6:0] anim_seg,     // {g,f,e,d,c,b,a} active-high
    output reg [1:0] state         // 디버그/LED 용
);
    localparam S_STOP = 2'd0,
               S_RUN  = 2'd1,
               S_ANIM = 2'd2;

    localparam IDLE_TICKS = IDLE_TIMEOUT_S * TICKS_PER_SEC;    // 5s = 5000 tick
    localparam MS_W       = $clog2(TICKS_PER_SEC + 1);
    localparam IDLE_W     = $clog2(IDLE_TICKS + 1);
    localparam ANIM_W     = $clog2(ANIM_STEP_TICKS + 1);

    reg [1:0]        next_state;
    reg [MS_W-1:0]   ms_cnt;      // 1초 안의 tick 위치 (0 ~ TICKS_PER_SEC-1)
    reg [IDLE_W-1:0] idle_cnt;    // STOP 상태 무입력 시간
    reg [ANIM_W-1:0] anim_cnt;    // 애니메이션 스텝 내 tick
    reg [2:0]        anim_idx;    // 0~5 : a,b,c,d,e,f

    // 다른 모드에서 누른 btnC/btnR 이 스톱워치에 영향을 주지 않도록 active 로 게이팅
    wire run_p     = btn_run   & active;
    wire clr_p     = btn_clear & active;
    // idle 타이머는 어떤 버튼이든 눌리면 리셋 ("무입력" 판정)
    wire any_pulse = btn_run | btn_clear | btn_other;

    // 무입력 타임아웃: STOP 에서 IDLE_TICKS 번째 tick. 같은 클럭에 버튼이 오면 버튼 우선
    wire idle_done = active && (state == S_STOP) && tick && !any_pulse
                     && (idle_cnt == IDLE_TICKS - 1);

    // ---------------- FSM : 다음 상태 (조합) ----------------
    always @(*) begin
        next_state = state;
        case (state)
            S_STOP: begin
                if (run_p)           next_state = S_RUN;
                else if (idle_done)  next_state = S_ANIM;
                // clr_p 는 STOP 유지 (카운터만 0)
            end
            S_RUN: begin
                // clr_p 무시 (정지 상태에서만 클리어). !active 여도 계속 RUN
                if (run_p)           next_state = S_STOP;
            end
            S_ANIM: begin
                if (run_p)                    next_state = S_RUN;   // 애니메이션 중지 + 즉시 재개
                else if (clr_p || !active)    next_state = S_STOP;  // 클리어 또는 모드 이탈
            end
            default:                 next_state = S_STOP;
        endcase
    end

    // ---------------- FSM : 상태 레지스터 ----------------
    always @(posedge clk, posedge reset) begin
        if (reset) state <= S_STOP;
        else       state <= next_state;
    end

    // ---------------- 시간 카운터 (ms → 초 → 분, BCD 체인) ----------------
    // BCD 로 직접 세면 표시할 때 나눗셈(/, %) 회로가 필요 없다.
    always @(posedge clk, posedge reset) begin
        if (reset) begin
            ms_cnt   <= 0;
            sec_ones <= 4'd0;
            sec_tens <= 4'd0;
            min_ones <= 4'd0;
            min_tens <= 4'd0;
        end
        else if (clr_p && state != S_RUN) begin      // STOP / ANIM 에서만 클리어
            ms_cnt   <= 0;
            sec_ones <= 4'd0;
            sec_tens <= 4'd0;
            min_ones <= 4'd0;
            min_tens <= 4'd0;
        end
        else if (state == S_RUN && tick) begin
            if (ms_cnt == TICKS_PER_SEC - 1) begin
                ms_cnt <= 0;                          // ms_cnt 랩과 sec_ones 증가가 같은 클럭
                if (sec_ones == 4'd9) begin
                    sec_ones <= 4'd0;
                    if (sec_tens == 4'd5) begin       // 59초 → 00초 자리올림
                        sec_tens <= 4'd0;
                        if (min_ones == 4'd9) begin
                            min_ones <= 4'd0;
                            if (min_tens == 4'd9)     // 99:59 → 00:00 랩어라운드
                                min_tens <= 4'd0;
                            else
                                min_tens <= min_tens + 4'd1;
                        end
                        else
                            min_ones <= min_ones + 4'd1;
                    end
                    else
                        sec_tens <= sec_tens + 4'd1;
                end
                else
                    sec_ones <= sec_ones + 4'd1;
            end
            else
                ms_cnt <= ms_cnt + 1'b1;
        end
    end

    // ---------------- idle 타이머 ----------------
    // STOP + active 에서만 증가. 버튼/상태변화/모드이탈 시 0 → 돌아왔을 때 처음부터 5초
    always @(posedge clk, posedge reset) begin
        if (reset)
            idle_cnt <= 0;
        else if (state != S_STOP || !active || any_pulse)
            idle_cnt <= 0;
        else if (tick) begin
            if (idle_cnt == IDLE_TICKS - 1)
                idle_cnt <= 0;                        // 이 클럭에 ANIM 으로 전이
            else
                idle_cnt <= idle_cnt + 1'b1;
        end
    end

    // ---------------- 애니메이션 스텝 ----------------
    // ANIM 이 아닐 때는 0 으로 묶어 두어 진입 시 항상 a 세그먼트부터 시작
    always @(posedge clk, posedge reset) begin
        if (reset) begin
            anim_cnt <= 0;
            anim_idx <= 3'd0;
        end
        else if (state != S_ANIM) begin
            anim_cnt <= 0;
            anim_idx <= 3'd0;
        end
        else if (tick) begin
            if (anim_cnt == ANIM_STEP_TICKS - 1) begin
                anim_cnt <= 0;
                anim_idx <= (anim_idx == 3'd5) ? 3'd0 : anim_idx + 3'd1;
            end
            else
                anim_cnt <= anim_cnt + 1'b1;
        end
    end

    // ---------------- 출력 ----------------
    // RUN : 1초의 전반 0.5초 켜짐 → 1초에 1번 깜박. STOP : 항상 켜짐(정지 표시). ANIM : 꺼짐
    assign dot      = (state == S_RUN)  ? (ms_cnt < TICKS_PER_SEC / 2) :
                      (state == S_STOP);
    assign anim_en  = (state == S_ANIM);
    // anim_idx 는 0~5 만 가지므로 bit6(g) 는 절대 켜지지 않음 → 바깥 테두리만 회전
    assign anim_seg = 7'b000_0001 << anim_idx;
endmodule
