`timescale 1ns / 1ps

// fnd_controller 단위 검증 : an 스캔 순서, 7seg 디코드, dp 위치, 애니메이션 override
// 출력(an/seg)은 FF 로 한 번 더 받으므로 sel 변화 후 1클럭 뒤에 반영됨에 유의
module tb_fnd_controller;
    reg        clk, reset, tick;
    reg  [3:0] d1000, d100, d10, d1, dp;
    reg        anim_en;
    reg  [6:0] anim_seg;
    wire [3:0] an;
    wire [7:0] seg;

    integer errors;
    integer k;

    fnd_controller u_fnd_controller (
        .clk     (clk),
        .reset   (reset),
        .tick    (tick),
        .d1000   (d1000),
        .d100    (d100),
        .d10     (d10),
        .d1      (d1),
        .dp      (dp),
        .anim_en (anim_en),
        .anim_seg(anim_seg),
        .an      (an),
        .seg     (seg)
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

    // 기대 seg 값 {dp,g,f,e,d,c,b,a} active-low (레퍼런스 디코드 표와 동일)
    function [7:0] exp_seg;
        input [3:0] v;
        input       dpb;
        reg   [6:0] s;
        begin
            case (v)
                4'd0:    s = 7'b1000000;
                4'd1:    s = 7'b1111001;
                4'd2:    s = 7'b0100100;
                4'd3:    s = 7'b0110000;
                4'd4:    s = 7'b0011001;
                4'd5:    s = 7'b0010010;
                4'd6:    s = 7'b0000010;
                4'd7:    s = 7'b1111000;
                4'd8:    s = 7'b0000000;
                4'd9:    s = 7'b0010000;
                default: s = 7'b1111111;
            endcase
            exp_seg = {~dpb, s};
        end
    endfunction

    // tick 1개 → sel 이동(1클럭) → 출력 FF 반영(1클럭) 후 negedge 에서 검사 가능
    task step_tick;
        begin
            @(negedge clk) tick = 1'b1;
            @(negedge clk) tick = 1'b0;
            @(negedge clk);
        end
    endtask

    initial begin
        errors = 0;
        reset = 1'b1; tick = 1'b0;
        d1000 = 4'd1; d100 = 4'd2; d10 = 4'd3; d1 = 4'd4;
        dp = 4'b0100;                       // 스톱워치처럼 digit2 에만 점
        anim_en = 1'b0; anim_seg = 7'b0;
        repeat (3) @(negedge clk);
        check(an, 4'b1111, "reset: all digits off");
        check(seg, 8'hFF, "reset: all segments off");
        reset = 1'b0;
        @(negedge clk);
        @(negedge clk);

        // ---- 스캔 순서 + 디코드 + dp 위치 ----
        check(an, 4'b1110, "sel0: an[0] on");
        check(seg, 8'b1001_1001, "sel0: '4', dp off");
        step_tick;
        check(an, 4'b1101, "sel1: an[1] on");
        check(seg, 8'b1011_0000, "sel1: '3', dp off");
        step_tick;
        check(an, 4'b1011, "sel2: an[2] on");
        check(seg, 8'b0010_0100, "sel2: '2', dp ON (seg[7]=0)");
        step_tick;
        check(an, 4'b0111, "sel3: an[3] on");
        check(seg, 8'b1111_1001, "sel3: '1', dp off");
        step_tick;
        check(an, 4'b1110, "sel wraps to 0");

        // ---- tick 이 없으면 자리 유지 ----
        repeat (10) @(negedge clk);
        check(an, 4'b1110, "no tick: digit held");

        // ---- 디코드 표 전체 (digit0 에서) : 10~15 는 blank ----
        for (k = 0; k < 16; k = k + 1) begin
            @(negedge clk) d1 = k;
            @(negedge clk);
            check(seg, exp_seg(k, 1'b0), "decode table");
        end
        @(negedge clk) d1 = 4'd0; dp = 4'b0001;
        @(negedge clk);
        check(seg, 8'b0100_0000, "digit0 '0' with dp on");
        dp = 4'b0100;

        // ---- 애니메이션 override : 4자리 모두 같은 패턴, dp 무시, 스캔은 계속 ----
        @(negedge clk) anim_en = 1'b1; anim_seg = 7'b000_0100;   // c
        @(negedge clk);
        check(seg, 8'b1111_1011, "anim: segment c only (digit0)");
        for (k = 0; k < 4; k = k + 1) begin
            step_tick;
            check(seg, 8'b1111_1011, "anim: same pattern on every digit");
        end
        check(an, 4'b1110, "anim: scan continues (back to an[0])");
        step_tick;
        step_tick;
        check(an, 4'b1011, "anim: an[2]");
        check(seg[7], 1, "anim: dp off even on digit2");
        @(negedge clk) anim_seg = 7'b010_0000;                     // f
        @(negedge clk);
        check(seg, 8'b1101_1111, "anim: segment f only");

        // ---- override 해제 → 숫자 복귀 ----
        @(negedge clk) anim_en = 1'b0;
        @(negedge clk);
        check(seg, 8'b0010_0100, "anim off: digit2 '2' with dp again");

        $display("=== tb_fnd_controller: %0d errors ===", errors);
        $finish;
    end

    initial begin
        #100_000;
        $display("FAIL: watchdog timeout");
        $display("=== tb_fnd_controller: TIMEOUT ===");
        $finish;
    end
endmodule
