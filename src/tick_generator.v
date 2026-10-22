`timescale 1ns / 1ps

// 100MHz → 1kHz "enable 펄스" 생성 (refre/tick_generator.v 재사용)
// 클럭을 분주해서 새 클럭을 만들지 않고, 1클럭 폭 tick 을 만들어 enable 로 쓴다.
// → 설계 전체가 단일 클럭 도메인으로 유지되어 클럭 스큐/CDC 문제가 없다.
module tick_generator #(
    parameter INPUT_FREQ = 100_000_000,   // 100 MHz
    parameter TICK_HZ    = 1000           // 1 kHz
)(
    input      clk,
    input      reset,
    output reg tick
);
    localparam TICK_COUNT = INPUT_FREQ / TICK_HZ;     // 100_000 클럭마다 1번
    localparam CNT_W      = $clog2(TICK_COUNT + 1);

    reg [CNT_W-1:0] r_tick_counter;

    always @(posedge clk, posedge reset) begin
        if (reset) begin
            tick           <= 1'b0;
            r_tick_counter <= 0;
        end
        else begin
            if (r_tick_counter == TICK_COUNT - 1) begin
                r_tick_counter <= 0;
                tick           <= 1'b1;     // 주기 TICK_COUNT, 폭 1클럭
            end
            else begin
                r_tick_counter <= r_tick_counter + 1'b1;
                tick           <= 1'b0;
            end
        end
    end
endmodule
