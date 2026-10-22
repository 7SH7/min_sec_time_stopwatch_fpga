`timescale 1ns / 1ps

// debouncer + edge_detector 단위 검증
// - 채터링(LIMIT 보다 짧은 토글)은 걸러지는가
// - 안정된 누름 1회당 1클럭 폭 펄스가 정확히 1개 나오는가 (떼는 순간엔 펄스 없음)
module tb_debouncer;
    localparam LIMIT = 20;          // 실제 999_999 대신 20 클럭으로 축소

    reg  clk, reset, noisy_btn;
    wire clean_btn, pulse;

    integer errors;
    integer cyc;                    // posedge 개수
    integer pulse_cnt;              // 펄스 개수 (상승 엣지 수)
    integer pulse_high;             // 펄스가 1 이었던 클럭 수
    integer t_press, t_pulse;
    reg     pulse_d;

    debouncer #(.DEBOUNCE_LIMIT(LIMIT)) u_debouncer (
        .clk      (clk),
        .reset    (reset),
        .noisy_btn(noisy_btn),
        .clean_btn(clean_btn)
    );

    edge_detector u_edge_detector (
        .clk  (clk),
        .reset(reset),
        .level(clean_btn),
        .pulse(pulse)
    );

    initial clk = 1'b0;
    always #5 clk = ~clk;           // 100 MHz

    // 모니터 : posedge 직전 값으로 펄스 개수/폭 측정
    always @(posedge clk) begin
        cyc <= cyc + 1;
        if (pulse) begin
            pulse_high <= pulse_high + 1;
            if (!pulse_d) begin
                pulse_cnt <= pulse_cnt + 1;
                t_pulse   <= cyc;
            end
        end
        pulse_d <= pulse;
    end

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

    // n 번 토글, 각 상태 5클럭 유지 (LIMIT 보다 짧음 → 채터링)
    task chatter;
        input [31:0] n;
        integer i;
        begin
            for (i = 0; i < n; i = i + 1) begin
                @(negedge clk) noisy_btn = ~noisy_btn;
                repeat (4) @(negedge clk);
            end
        end
    endtask

    // 안정 상태 유지 (LIMIT 의 3배)
    task hold;
        input level;
        begin
            @(negedge clk) noisy_btn = level;
            t_press = cyc;
            repeat (3 * LIMIT) @(negedge clk);
        end
    endtask

    initial begin
        errors = 0; cyc = 0; pulse_cnt = 0; pulse_high = 0; pulse_d = 1'b0;
        t_press = 0; t_pulse = 0;
        reset = 1'b1; noisy_btn = 1'b0;
        repeat (5) @(negedge clk);
        reset = 1'b0;

        // 1) 채터링만 → 출력 변화 없음
        chatter(8);
        check(clean_btn, 0, "chatter only: clean_btn stays 0");
        check(pulse_cnt, 0, "chatter only: no pulse");

        // 2) 안정 누름 → 펄스 1개, 폭 1클럭, 지연 = 동기화 2 + LIMIT + 1
        hold(1'b1);
        check(clean_btn, 1, "stable press: clean_btn = 1");
        check(pulse_cnt, 1, "stable press: exactly 1 pulse");
        check(pulse_high, 1, "pulse width = 1 clk");
        $display("INFO: press->pulse latency = %0d clk (expect about LIMIT+3 = %0d)",
                 t_pulse - t_press, LIMIT + 3);
        check((t_pulse - t_press >= LIMIT + 2) && (t_pulse - t_press <= LIMIT + 4), 1,
              "latency within LIMIT+2..LIMIT+4");

        // 3) 떼기 (채터링 후 안정 0) → 펄스 추가 없음
        chatter(8);
        hold(1'b0);
        check(clean_btn, 0, "release: clean_btn = 0");
        check(pulse_cnt, 1, "release: no extra pulse");

        // 4) 1클럭 글리치 → 무시
        @(negedge clk) noisy_btn = 1'b1;
        @(negedge clk) noisy_btn = 1'b0;
        repeat (3 * LIMIT) @(negedge clk);
        check(pulse_cnt, 1, "1-clk glitch ignored");

        // 5) 채터링 섞인 두 번째 누름 → 펄스 1개만 추가, 오래 눌러도 추가 펄스 없음
        chatter(6);
        hold(1'b1);
        repeat (10 * LIMIT) @(negedge clk);
        check(pulse_cnt, 2, "bouncy long press: one more pulse only");
        check(pulse_high, 2, "every pulse is 1 clk wide");
        hold(1'b0);

        $display("=== tb_debouncer: %0d errors ===", errors);
        $finish;
    end

    initial begin
        #1_000_000;
        $display("FAIL: watchdog timeout");
        $display("=== tb_debouncer: TIMEOUT ===");
        $finish;
    end
endmodule
