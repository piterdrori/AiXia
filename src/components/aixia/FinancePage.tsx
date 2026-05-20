import type { ReactNode } from "react";



import { AixiaPage } from "./AixiaPage";



type FinancePageProps = {

  children: ReactNode;

  className?: string;

};



export function FinancePage({ children, className = "" }: FinancePageProps) {

  return (

    <AixiaPage

      surface="command"

      className={`aixia-command-page aixia-finance-page ${className}`.trim()}

    >

      {children}

    </AixiaPage>

  );

}


