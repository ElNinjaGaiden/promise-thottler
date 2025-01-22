import moment from "moment";

function* chunks<T>(arr: T[], n: number): Generator<T[], void> {
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n);
  }
}

const start = 0;
const end = 23;
const unitsOfTime = 2;
const allUnits = Array.from({ length: end + 1 }, (_, i) => i);
console.log(allUnits);
const segments: Array<number[]> = [...chunks(allUnits, unitsOfTime)];
console.log(segments);
// const now = moment();
// const currentMinute = now.minutes();
// const currentSegment = segments.find(s => s.includes(currentMinute));

var date = moment("2025-01-22T00:01:00");
console.log('Ojo', date.format('HH:mm:ss'));
