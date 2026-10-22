`timescale 1ns / 1ps

// 14bit 이진수(0~9999) → 천/백/십/일 BCD 4자리 (refre 의 /, % 버전 그대로)
// 상수 나눗셈이라 합성 시 조합 회로로 풀리며, 14bit 라 자원 부담이 작다.
module bin2bcd4digit (
    input  [13:0] seg_data,
    output [3:0]  d1,
    output [3:0]  d10,
    output [3:0]  d100,
    output [3:0]  d1000
);
    assign d1    =  seg_data         % 10;
    assign d10   = (seg_data / 10)   % 10;
    assign d100  = (seg_data / 100)  % 10;
    assign d1000 = (seg_data / 1000) % 10;
endmodule
