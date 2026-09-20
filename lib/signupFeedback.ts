export function signupErrorMessage(data:unknown):string{
 const error=(data as {error?:unknown}|null)?.error;
 if(typeof error==="string")return error;
 if(error&&typeof error==="object"){
  const details=error as {formErrors?:unknown;fieldErrors?:Record<string,unknown>};
  if(Array.isArray(details.formErrors)&&typeof details.formErrors[0]==="string")return details.formErrors[0];
  for(const [field,messages]of Object.entries(details.fieldErrors||{})){
   if(Array.isArray(messages)&&typeof messages[0]==="string")return `${({businessName:"Business name",slug:"Business address",ownerName:"Your name",contactEmail:"Email",username:"Username",password:"Password"} as Record<string,string>)[field]||field}: ${messages[0]}`;
  }
 }
 return "Your account could not be created. Please try again.";
}
export function suggestBusinessSlug(value:string){return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,48).replace(/-+$/g,"");}
