`timescale 1ns / 1ps

// 10ms 단위 업/다운 카운터 (0~9999)
// 레퍼런스는 100MHz 를 직접 1,000,000 세었지만, 여기서는 공통 1kHz tick 을 10번 센다.
// → 시간 기준이 tick_generator 하나로 통일되어 TB 에서 시간 스케일을 한 번에 줄일 수 있다.
module up_down_counter #(parameter TICKS_PER_STEP = 10) (   // 1kHz tick × 10 = 10ms
    input             clk,
    input             reset,
    input             tick,
    input             en_up,
    input             en_down,
    output reg [13:0] count
);
    localparam STEP_W = $clog2(TICKS_PER_STEP + 1);

    reg [STEP_W-1:0] step_cnt;

    always @(posedge clk, posedge reset) begin
        if (reset) begin
            step_cnt <= 0;
            count    <= 14'd0;
        end
        else if ((en_up || en_down) && tick) begin
            if (step_cnt == TICKS_PER_STEP - 1) begin
                step_cnt <= 0;
                if (en_up)                                  // en_up 우선 (동시 1 은 발생하지 않음)
                    count <= (count >= 14'd9999) ? 14'd0 : count + 14'd1;
                else
                    count <= (count == 14'd0) ? 14'd9999 : count - 14'd1;
            end
            else
                step_cnt <= step_cnt + 1'b1;
        end
        // 둘 다 0 이면 값 유지 (다른 모드에서 돌아와도 이어서 셈)
    end
endmodule
