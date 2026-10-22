`timescale 1ns / 1ps

// tick_generator 단위 검증 : 주기 = TICK_COUNT 클럭, 폭 = 1클럭
module tb_tick_generator;
    localparam INPUT_FREQ = 1000;
    localparam TICK_HZ    = 100;
    localparam TICK_COUNT = INPUT_FREQ / TICK_HZ;   // 10 클럭

    reg  clk, reset;
    wire tick;

    integer errors;
    integer cyc;
    integer t0, t1, k, n_ticks;

    tick_generator #(.INPUT_FREQ(INPUT_FREQ), .TICK_HZ(TICK_HZ)) u_tick_generator (
        .clk  (clk),
        .reset(reset),
        .tick (tick)
    );

    initial clk = 1'b0;
    always #5 clk = ~clk;

    always @(posedge clk) cyc <= cyc + 1;

    task check;
        input [31:0]     got;
        input [31:0]     exp;
        input [8*64-1:0] msg;
        begin
            if (got === exp)
                $display("PASS: %0s (got %0d)", msg, got);
            else begin
                $display("FAIL: %0s (got %0d, exp %0d) @%0t", msg, got, exp, $time);
                errors = errors + 1;
            end
        end
    endtask

    // 다음 tick 이 1 인 negedge 까지 대기, 그때의 클럭 번호 반환
    task wait_tick;
        output [31:0] t;
        begin
            @(negedge clk);
            while (tick !== 1'b1) @(negedge clk);
            t = cyc;
        end
    endtask

    initial begin
        errors = 0; cyc = 0;
        reset = 1'b1;
        repeat (3) @(negedge clk);
        check(tick, 0, "tick = 0 during reset");
        reset = 1'b0;

        wait_tick(t0);
        @(negedge clk);
        check(tick, 0, "pulse width = 1 clk");

        for (k = 0; k < 4; k = k + 1) begin
            wait_tick(t1);
            check(t1 - t0, TICK_COUNT, "tick period = TICK_COUNT");
            @(negedge clk);
            check(tick, 0, "pulse width = 1 clk");
            t0 = t1;
        end

        // 연속 10 * TICK_COUNT 클럭 동안 tick 은 정확히 10 번
        n_ticks = 0;
        for (k = 0; k < 10 * TICK_COUNT; k = k + 1) begin
            @(negedge clk);
            if (tick) n_ticks = n_ticks + 1;
        end
        check(n_ticks, 10, "10 ticks in 10*TICK_COUNT clocks");

        $display("=== tb_tick_generator: %0d errors ===", errors);
        $finish;
    end

    initial begin
        #100_000;
        $display("FAIL: watchdog timeout");
        $display("=== tb_tick_generator: TIMEOUT ===");
        $finish;
    end
endmodule
