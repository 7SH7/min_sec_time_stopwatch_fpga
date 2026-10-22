`timescale 1ns / 1ps

// 버튼 디바운서 (refre/debouncer.v 재사용, 파라미터 폭만 일반화)
// - 버튼은 클럭과 무관한 비동기 입력 → 2단 FF 로 동기화해서 메타스테빌리티 전파를 막는다.
// - 동기화된 입력이 현재 출력과 다른 상태로 DEBOUNCE_LIMIT 클럭 동안 유지돼야 출력에 반영
//   → 기계식 접점의 채터링(수 ms)을 걸러낸다. 100MHz × 1,000,000 = 10ms.
module debouncer #(parameter DEBOUNCE_LIMIT = 999_999) (
    input      clk,
    input      reset,
    input      noisy_btn,   // raw noisy button input
    output reg clean_btn
);
    // 카운터 폭을 파라미터에서 계산 → TB 에서 LIMIT 를 작게 줘도 그대로 동작
    localparam CNT_W = $clog2(DEBOUNCE_LIMIT + 1);

    reg [CNT_W-1:0] r_count;

    // 동기화 FF: ASYNC_REG 속성으로 두 FF 를 같은 슬라이스에 배치하게 해 MTBF 를 높인다
    (* ASYNC_REG = "TRUE" *) reg btn_meta;
    (* ASYNC_REG = "TRUE" *) reg btn_sync;

    always @(posedge clk, posedge reset) begin
        if (reset) begin
            btn_meta <= 1'b0;
            btn_sync <= 1'b0;
        end
        else begin
            btn_meta <= noisy_btn;
            btn_sync <= btn_meta;
        end
    end

    always @(posedge clk, posedge reset) begin
        if (reset) begin
            r_count   <= 0;
            clean_btn <= 1'b0;
        end
        else begin
            if (btn_sync == clean_btn)
                r_count <= 0;                       // 상태가 다시 같아지면(채터링) 처음부터 다시 센다
            else if (r_count < DEBOUNCE_LIMIT)
                r_count <= r_count + 1'b1;          // 바뀐 상태가 유지되는 시간 측정 중
            else begin
                clean_btn <= btn_sync;              // 충분히 오래 유지됨 → 출력 반영
                r_count   <= 0;
            end
        end
    end
endmodule
