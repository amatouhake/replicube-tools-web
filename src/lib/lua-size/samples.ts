type Sample = {
	code: string;
	size: number;
};

export const samples: Sample[] = [
	{
		code: `function f(v)
	return (v+.13)//YELLOW%3%2
end

repeat	
	if f(x)+f(y)+f(z) == 2 then
		return YELLOW
	end
	
	YELLOW = YELLOW / 3
until YELLOW < 1
`,
		size: 44
	},
	{
		code: `-- HELLO
if z == 0 then
	if t == 0 then
		if (abs(x) < 3 and y == 0) or (abs(x) == 2 and abs(y) < 3) then
			return BLACK
		elseif x == 0 and abs(y) > 1 then
			return
		end
	elseif t == 1 then
		if (abs(x) < 3 and (abs(y) == 2 or y == 0)) or
		   x == -2 and abs(y) < 3 then
			return BLACK
		end
	elseif t == 2 or t == 3 then
		if (x == -2 or y == -2) and min(x,y) > -3 and max(x,y) < 3 then
			return BLACK
		elseif min(x,y) > -1 then
			return
		end
	elseif t == 4 then
		if (abs(x) == 2 and abs(y) < 3) or (abs(y) == 2 and abs(x) < 3) then
			return BLACK
		elseif x == y and y == 0 then
			return
		end
	end
	
	if abs(x) < 4 and abs(y) < 4 then
		return WHITE
	end
end

`,
		size: 198
	},
	{
		code: `repeat
	y = y+btoi((x+13)//YELLOW%3&(z+13)//YELLOW%3 ~= 1)*YELLOW
	Y = Y or y
	YELLOW = YELLOW/3
until YELLOW < 1

return
y <= 4 and 3>>sign(Y)|9`,
		size: 54
	},
	{
		code: `a = 14-y>>2

return
t > a and max(x, z) < 1.65^a-14 and a+6



-- 29T
--[[
a = 14-y>>2

return
t > a and log(max(x, z)+14)*2 < a and a+6
]]`,
		size: 29
	},
	{
		code: `return 
4-y>=2<<(x^2+z^2)//6.5 and 
(
	y==-4 or
	9>>(254.031e3>>y*-7+x & 6>>z & 2)
)`,
		size: 44
	}
];
