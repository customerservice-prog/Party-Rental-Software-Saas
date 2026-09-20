// Event dates are calendar dates stored at UTC midnight by the booking forms.
// Use the organization's local current date to decide which day is "today".
export function dashboardDates(now:Date,timeZone:string,query:{year?:string;month?:string}={}){
  let parts:Intl.DateTimeFormatPart[];
  try{parts=new Intl.DateTimeFormat("en-US",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);}
  catch{parts=new Intl.DateTimeFormat("en-US",{timeZone:"UTC",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);}
  const part=(name:string)=>Number(parts.find(p=>p.type===name)!.value);
  const currentYear=part("year"),currentMonth=part("month")-1;
  const parsedYear=Number(query.year),parsedMonth=Number(query.month);
  const year=query.year&&Number.isInteger(parsedYear)&&parsedYear>=2000&&parsedYear<=2100?parsedYear:currentYear;
  const month=query.month!==undefined&&query.month!==""&&Number.isInteger(parsedMonth)&&parsedMonth>=0&&parsedMonth<=11?parsedMonth:currentMonth;
  const today=new Date(Date.UTC(currentYear,currentMonth,part("day")));
  return {year,month,today,tomorrow:new Date(+today+86400000),weekEnd:new Date(+today+7*86400000),monthStart:new Date(Date.UTC(year,month,1)),monthEnd:new Date(Date.UTC(year,month+1,1))};
}
