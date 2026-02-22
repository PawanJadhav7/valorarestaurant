import math

class GetResult:
    def __init__(self,result):
        self.result = result

    def fetchresult(self):
        points = 30
        xs = list(range(points))
        ys = [int(self.result + 200 * math.sin((i ** 2) / 3)) for i in range(points)]
        return {"x": xs, "y": ys}
  

