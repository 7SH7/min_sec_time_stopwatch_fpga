`timescale 1ns / 1ps

// top_stopwatch 통합 검증 : 실제 버튼처럼 채터링 + 길게 누르기 → 모드 순환, 스톱워치 전체 흐름
// 파라미터 축소 : 디바운스 20클럭, tick = 10클럭, 1초 = 10 tick(100클럭), idle 2초(200클럭),
//                 애니메이션 스텝 2 tick(20클럭)
module tb_top_stopwatch;
    localparam DEB   = 20;
    localparam HOLD  = 3 * DEB;     // 디바운스 한도의 3배 동안 누름
    localparam REL   = 2 * DEB;     // 떼고 나서도 한도보다 길게 대기

    localparam M_IDLE = 3'd0, M_UP = 3'd1, M_DOWN = 3'd2, M_SW_READ = 3'd3, M_STOPWATCH = 3'd4;
    localparam S_STOP = 2'd0, S_RUN = 2'd1, S_ANIM = 2'd2;

    reg        clk, reset;
    reg  [2:0] btn;
    reg  [7:0] sw;
    wire [3:0] an;
    wire [7:0] seg;
    wire [15:0] led;

    integer errors;
    integer k, secs, secs0, c0;
    reg [15:0] t_snap;
    reg [7:0]  seg_snap;

    wire [5:0]  lit    = ~seg[5:0];                              // 켜진 외곽 세그먼트 (active-high)
    wire [15:0] t_now  = {dut.u_stopwatch.min_tens, dut.u_stopwatch.min_ones,
                          dut.u_stopwatch.sec_tens, dut.u_stopwatch.sec_ones};
    wire [1:0]  sw_st  = dut.u_stopwatch.state;

    top_stopwatch #(
        .DEBOUNCE_LIMIT (DEB),
        .INPUT_FREQ     (100),
        .TICK_HZ        (10),        // tick 주기 10 클럭
        .TICKS_PER_STEP (10),
        .TICKS_PER_SEC  (10),
        .IDLE_TIMEOUT_S (2),
        .ANIM_STEP_TICKS(2)
    ) dut (
        .clk  (clk),
        .reset(reset),
        .btn  (btn),
        .sw   (sw),
        .an   (an),
        .seg  (seg),
        .led  (led)
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

    // 실제 버튼 흉내 : 3번 튀고(high 2클럭 / low 2클럭) → HOLD 동안 누름 → 떼고 REL 대기
    task press_btn;
        input [1:0] idx;
        integer b;
        begin
            for (b = 0; b < 3; b = b + 1) begin
                @(negedge clk) btn[idx] = 1'b1;
                repeat (2) @(negedge clk);
                btn[idx] = 1'b0;
                repeat (2) @(negedge clk);
            end
            btn[idx] = 1'b1;
            repeat (HOLD) @(negedge clk);
            btn[idx] = 1'b0;
            repeat (REL) @(negedge clk);
        end
    endtask

    // 특정 자리가 선택될 때까지 대기 (최대 100클럭)
    task wait_an;
        input [3:0] target;
        integer w;
        begin
            w = 0;
            @(negedge clk);
            while (an !== target && w < 100) begin
                @(negedge clk);
                w = w + 1;
            end
        end
    endtask

    initial begin
        errors = 0;
        reset = 1'b1; btn = 3'b000; sw = 8'd123;
        repeat (10) @(negedge clk);
        reset = 1'b0;

        // ---- IDLE ----
        check(led[15:13], M_IDLE, "reset: mode IDLE");
        check(led, 16'h0000, "IDLE: led all 0");
        repeat (30) @(negedge clk);
        check(seg, 8'hC0, "IDLE: FND shows 0 (dp off)");

        // ---- UP ----
        press_btn(0);
        check(led[15:13], M_UP, "btnL: IDLE -> UP");
        repeat (300) @(negedge clk);
        check(led[12:0] != 13'd0, 1, "UP: counter increased");

        // ---- DOWN ----
        press_btn(0);
        check(led[15:13], M_DOWN, "btnL: UP -> DOWN");
        c0 = led[12:0];
        repeat (200) @(negedge clk);
        check(led[12:0] < c0, 1, "DOWN: counter decreased");

        // ---- SW_READ ----
        press_btn(0);
        check(led[15:13], M_SW_READ, "btnL: DOWN -> SW_READ");
        check(led[7:0], 8'd123, "SW_READ: led = sw");
        check(led[12:8], 5'd0, "SW_READ: upper data led 0");
        check({dut.w_d1000, dut.w_d100, dut.w_d10, dut.w_d1}, 16'h0123, "SW_READ: BCD 0123");

        // ---- STOPWATCH ----
        press_btn(0);
        check(led[15:13], M_STOPWATCH, "btnL: SW_READ -> STOPWATCH");
        check(led[1:0], S_STOP, "STOPWATCH: STOP");
        check(t_now, 16'h0000, "STOPWATCH: 00:00");

        // start
        press_btn(1);
        check(led[1:0], S_RUN, "btnC: STOP -> RUN");
        repeat (1000) @(negedge clk);
        secs = dut.u_stopwatch.sec_tens * 10 + dut.u_stopwatch.sec_ones;
        $display("INFO: seconds after ~1077 clk = %0d (expect ~10)", secs);
        check(secs >= 9 && secs <= 12, 1, "RUN: seconds advanced ~10");

        // stop
        press_btn(1);
        check(led[1:0], S_STOP, "btnC: RUN -> STOP");
        t_snap = t_now;
        repeat (50) @(negedge clk);
        check(t_now, t_snap, "STOP: value held");

        // clear
        // 주의: 이 시점에 idle 타이머가 약 16/20 tick 까지 와 있다. DEB/HOLD/REL 을 키우면
        //       btnR 펄스보다 ANIM 진입이 먼저 일어나 아래 "still STOP" 체크가 깨진다.
        press_btn(2);
        check(t_now, 16'h0000, "btnR: clear to 00:00");
        check(led[1:0], S_STOP, "clear: still STOP");

        // dp 는 digit2(an[2]) 에만, STOP 이면 켜짐
        wait_an(4'b1011);
        check(seg[7], 0, "STOP: dp on at an[2]");
        wait_an(4'b1110);
        check(seg[7], 1, "dp off at an[0]");

        // idle → ANIM
        repeat (300) @(negedge clk);
        check(led[1:0], S_ANIM, "STOP idle 2s -> ANIM");
        check(seg[7:6], 2'b11, "ANIM: dp and g off");
        check((lit != 6'd0) && ((lit & (lit - 6'd1)) == 6'd0), 1, "ANIM: exactly one outer segment lit");
        seg_snap = seg;
        repeat (20) @(negedge clk);
        check(seg != seg_snap, 1, "ANIM: segment rotated after one step");

        // ANIM 중 btnC → RUN
        press_btn(1);
        check(led[1:0], S_RUN, "btnC in ANIM: -> RUN");

        // 다시 STOP → ANIM → btnL 로 모드 이탈 → 스톱워치는 STOP 으로
        press_btn(1);
        check(led[1:0], S_STOP, "btnC: RUN -> STOP");
        repeat (300) @(negedge clk);
        check(led[1:0], S_ANIM, "-> ANIM again");
        t_snap = t_now;
        press_btn(0);
        check(led[15:13], M_UP, "btnL in ANIM: STOPWATCH -> UP");
        check(sw_st, S_STOP, "leaving mode stops animation (STOP)");

        // 다른 모드에서 btnC/btnR 은 스톱워치에 영향 없음
        press_btn(1);
        press_btn(2);
        check(sw_st, S_STOP, "btnC in UP mode: stopwatch unaffected");
        check(t_now, t_snap, "btnR in UP mode: value unaffected");

        // 한 바퀴 돌아 STOPWATCH 복귀 → 값 유지
        press_btn(0);
        press_btn(0);
        press_btn(0);
        check(led[15:13], M_STOPWATCH, "cycle back to STOPWATCH");
        check(led[1:0], S_STOP, "back: STOP");
        check(t_now, t_snap, "back: value preserved");

        // RUN 상태로 모드를 떠나도 계속 카운트
        press_btn(1);
        check(led[1:0], S_RUN, "RUN before leaving");
        press_btn(0);
        check(led[15:13], M_UP, "left to UP");
        secs0 = dut.u_stopwatch.sec_tens * 10 + dut.u_stopwatch.sec_ones;
        repeat (500) @(negedge clk);
        secs = dut.u_stopwatch.sec_tens * 10 + dut.u_stopwatch.sec_ones;
        check(sw_st, S_RUN, "inactive: still RUN");
        check(secs > secs0, 1, "inactive RUN: time keeps flowing");
        press_btn(1);
        check(sw_st, S_RUN, "btnC in UP mode cannot stop stopwatch");
        check(led[15:13], M_UP, "btnC does not change mode");

        $display("=== tb_top_stopwatch: %0d errors ===", errors);
        $finish;
    end

    initial begin
        #2_000_000;
        $display("FAIL: watchdog timeout");
        $display("=== tb_top_stopwatch: TIMEOUT ===");
        $finish;
    end
endmodule
