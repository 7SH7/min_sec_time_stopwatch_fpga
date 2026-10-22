`timescale 1ns / 1ps

// stopwatch 단위 검증
// tick 을 TB 가 직접 1개씩 넣으므로 "tick 몇 개 후 어떤 값" 을 정확히 판정할 수 있다.
// 파라미터 축소 : 1초 = 10 tick, idle 2초 = 20 tick, 애니메이션 스텝 = 2 tick
module tb_stopwatch;
    localparam TPS   = 10;
    localparam IDLE  = 2;
    localparam ASTEP = 2;

    localparam S_STOP = 2'd0,
               S_RUN  = 2'd1,
               S_ANIM = 2'd2;

    reg clk, reset, tick, active, btn_run, btn_clear, btn_other;

    wire [3:0] min_tens, min_ones, sec_tens, sec_ones;
    wire       dot, anim_en;
    wire [6:0] anim_seg;
    wire [1:0] state;

    // {MM,SS} 를 16bit BCD 로 묶어 hex 로 보면 그대로 "MMSS" 로 읽힌다
    wire [15:0] t_now = {min_tens, min_ones, sec_tens, sec_ones};

    integer errors;
    integer i;

    stopwatch #(
        .TICKS_PER_SEC  (TPS),
        .IDLE_TIMEOUT_S (IDLE),
        .ANIM_STEP_TICKS(ASTEP)
    ) u_stopwatch (
        .clk      (clk),
        .reset    (reset),
        .tick     (tick),
        .active   (active),
        .btn_run  (btn_run),
        .btn_clear(btn_clear),
        .btn_other(btn_other),
        .min_tens (min_tens),
        .min_ones (min_ones),
        .sec_tens (sec_tens),
        .sec_ones (sec_ones),
        .dot      (dot),
        .anim_en  (anim_en),
        .anim_seg (anim_seg),
        .state    (state)
    );

    initial clk = 1'b0;
    always #5 clk = ~clk;

    task check;
        input [31:0]     got;
        input [31:0]     exp;
        input [8*64-1:0] msg;
        begin
            if (got === exp)
                $display("PASS: %0s (got %0h)", msg, got);
            else begin
                $display("FAIL: %0s (got %0h, exp %0h) @%0t", msg, got, exp, $time);
                errors = errors + 1;
            end
        end
    endtask

    // tick n 개 (각 tick 은 1클럭 폭, 사이에 1클럭 쉼)
    task do_ticks;
        input [31:0] n;
        integer j;
        begin
            for (j = 0; j < n; j = j + 1) begin
                @(negedge clk) tick = 1'b1;
                @(negedge clk) tick = 1'b0;
            end
        end
    endtask

    task press_run;
        begin
            @(negedge clk) btn_run = 1'b1;
            @(negedge clk) btn_run = 1'b0;
        end
    endtask

    task press_clear;
        begin
            @(negedge clk) btn_clear = 1'b1;
            @(negedge clk) btn_clear = 1'b0;
        end
    endtask

    task press_other;
        begin
            @(negedge clk) btn_other = 1'b1;
            @(negedge clk) btn_other = 1'b0;
        end
    endtask

    initial begin
        errors = 0;
        reset = 1'b1; tick = 1'b0; active = 1'b0;
        btn_run = 1'b0; btn_clear = 1'b0; btn_other = 1'b0;
        repeat (5) @(negedge clk);
        reset = 1'b0;
        @(negedge clk);

        // ---- 리셋 상태 ----
        check(state, S_STOP, "reset: state STOP");
        check(t_now, 16'h0000, "reset: 00:00");
        check(dot, 1, "reset/STOP: dot on");
        check(anim_en, 0, "reset: anim off");

        // ---- RUN, dot 0.5초 토글, 초 증가 ----
        active = 1'b1;
        press_run;
        check(state, S_RUN, "btn_run: STOP -> RUN");
        check(dot, 1, "RUN ms=0: dot on");
        do_ticks(5);
        check(dot, 0, "RUN ms=5 (half sec): dot off");
        do_ticks(4);
        check(t_now, 16'h0000, "9 ticks: still 00:00");
        check(dot, 0, "RUN ms=9: dot off");
        do_ticks(1);
        check(t_now, 16'h0001, "10 ticks: 00:01 (ms wrap + sec inc same clk)");
        check(dot, 1, "new second: dot on again");
        do_ticks(4);
        check(dot, 1, "RUN ms=4: dot on");
        do_ticks(1);
        check(dot, 0, "RUN ms=5: dot off");
        do_ticks(5);
        check(t_now, 16'h0002, "00:02");

        // ---- 59 → 00 자리올림 ----
        do_ticks(57 * TPS);
        check(t_now, 16'h0059, "00:59");
        do_ticks(TPS);
        check(t_now, 16'h0100, "59s carry -> 01:00");

        // ---- STOP 유지 / RUN 중 clear 무시 ----
        press_clear;
        check(t_now, 16'h0100, "clear ignored in RUN");
        check(state, S_RUN, "clear in RUN: stays RUN");
        press_run;
        check(state, S_STOP, "btn_run: RUN -> STOP");
        check(dot, 1, "STOP: dot on");
        do_ticks(5);
        check(t_now, 16'h0100, "STOP: value held");

        // ---- clear ----
        press_clear;
        check(t_now, 16'h0000, "clear in STOP: 00:00");
        check(state, S_STOP, "clear in STOP: stays STOP");

        // ---- 초 중간에 정지 → clear 가 ms_cnt 도 0 으로 되돌리는지 (리뷰 지적 보강) ----
        // ms_cnt 가 남아 있으면 재시작 후 5 tick 만에 00:01 이 되어 버린다.
        press_run;
        do_ticks(5);                                   // ms_cnt = 5
        press_run;
        check(state, S_STOP, "mid-second stop: STOP");
        check(dot, 1, "mid-second stop: dot stays on");
        press_clear;                                   // ms_cnt 도 0 이어야 함
        press_run;
        do_ticks(5);
        check(t_now, 16'h0000, "clear reset ms_cnt: 5 ticks after restart still 00:00");
        do_ticks(5);
        check(t_now, 16'h0001, "clear reset ms_cnt: 10 ticks after restart -> 00:01");
        press_run;                                     // 다시 STOP
        press_clear;                                   // 00:00, idle 타이머는 마지막 펄스부터 다시 시작
        check(t_now, 16'h0000, "back to 00:00 before idle test");

        // ---- idle 타임아웃 → ANIM ----
        do_ticks(IDLE * TPS - 1);
        check(state, S_STOP, "idle 19 ticks: still STOP");
        do_ticks(1);
        check(state, S_ANIM, "idle 20 ticks: STOP -> ANIM");
        check(anim_en, 1, "ANIM: anim_en");
        check(anim_seg, 7'b000_0001, "ANIM start: segment a");
        check(dot, 0, "ANIM: dot off");

        // ---- 애니메이션 회전 a→b→c→d→e→f→a ----
        for (i = 1; i <= 6; i = i + 1) begin
            do_ticks(ASTEP);
            check(anim_seg, 7'b000_0001 << (i % 6), "ANIM rotate one segment per step");
            check(anim_seg[6], 0, "segment g never lit");
        end

        // ---- ANIM 중 btn_run → RUN ----
        press_run;
        check(state, S_RUN, "btn_run in ANIM: -> RUN");
        check(anim_en, 0, "RUN: anim off");
        do_ticks(TPS);
        check(t_now, 16'h0001, "count resumed after ANIM");

        // ---- ANIM 중 btn_clear → STOP + 00:00 ----
        press_run;
        do_ticks(IDLE * TPS);
        check(state, S_ANIM, "STOP 2s -> ANIM again");
        press_clear;
        check(state, S_STOP, "btn_clear in ANIM: -> STOP");
        check(t_now, 16'h0000, "btn_clear in ANIM: 00:00");

        // ---- ANIM 중 active=0 (모드 이탈) → STOP ----
        do_ticks(IDLE * TPS);
        check(state, S_ANIM, "ANIM again");
        @(negedge clk) active = 1'b0;
        @(negedge clk);
        check(state, S_STOP, "active=0 in ANIM: -> STOP");
        check(anim_en, 0, "active=0: anim off");

        // ---- active=0 이면 idle 타이머 정지 ----
        do_ticks(3 * IDLE * TPS);
        check(state, S_STOP, "inactive STOP never enters ANIM");

        // ---- active=0 이면 버튼 무시 ----
        active = 1'b1;
        press_run;
        do_ticks(TPS);
        press_run;
        check(t_now, 16'h0001, "setup 00:01 STOP");
        active = 1'b0;
        press_clear;
        check(t_now, 16'h0001, "inactive: clear ignored");
        press_run;
        check(state, S_STOP, "inactive: run ignored");

        // ---- RUN 은 active=0 이어도 계속 ----
        active = 1'b1;
        press_run;
        active = 1'b0;
        do_ticks(TPS);
        check(state, S_RUN, "inactive RUN keeps running");
        check(t_now, 16'h0002, "inactive RUN counts: 00:02");
        press_run;
        check(state, S_RUN, "inactive: run pulse cannot stop");

        // ---- idle 타이머는 btn_other 로도 리셋 ----
        active = 1'b1;
        press_run;
        check(state, S_STOP, "RUN -> STOP");
        do_ticks(15);
        press_other;
        do_ticks(15);
        check(state, S_STOP, "btn_other reset idle: still STOP after 15+15");
        do_ticks(4);
        check(state, S_STOP, "19 ticks after btn_other: STOP");
        do_ticks(1);
        check(state, S_ANIM, "20 ticks after btn_other: ANIM");

        // ---- 분 자리올림 / 99:59 → 00:00 랩 ----
        press_clear;
        press_run;
        do_ticks(599 * TPS);
        check(t_now, 16'h0959, "09:59");
        do_ticks(TPS);
        check(t_now, 16'h1000, "min carry -> 10:00");
        do_ticks(5399 * TPS);
        check(t_now, 16'h9959, "99:59");
        do_ticks(TPS);
        check(t_now, 16'h0000, "wrap 99:59 -> 00:00");
        check(state, S_RUN, "still RUN after wrap");

        $display("=== tb_stopwatch: %0d errors ===", errors);
        $finish;
    end

    initial begin
        #5_000_000;
        $display("FAIL: watchdog timeout");
        $display("=== tb_stopwatch: TIMEOUT ===");
        $finish;
    end
endmodule
