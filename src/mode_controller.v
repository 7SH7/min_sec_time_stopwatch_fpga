`timescale 1ns / 1ps

// btnL 펄스마다 모드 순환: IDLE → UP → DOWN → SW_READ → STOPWATCH → UP → ...
// IDLE 은 리셋 직후에만 존재 (레퍼런스 동작 유지)
module mode_controller (
    input            clk,
    input            reset,
    input            btn_mode_pulse,
    output reg [2:0] mode
);
    localparam IDLE      = 3'd0,
               UP        = 3'd1,
               DOWN      = 3'd2,
               SW_READ   = 3'd3,
               STOPWATCH = 3'd4;

    always @(posedge clk, posedge reset) begin
        if (reset)
            mode <= IDLE;
        else if (btn_mode_pulse) begin
            // 펄스 입력이라 버튼을 오래 눌러도 한 단계만 이동
            if (mode == IDLE || mode == STOPWATCH)
                mode <= UP;
            else
                mode <= mode + 3'd1;
        end
    end
endmodule
