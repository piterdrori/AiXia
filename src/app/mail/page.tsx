import { useLanguage } from "@/lib/i18n";

import { AixiaHero, AixiaPage } from "@/components/aixia";

import { Badge } from "@/components/ui/badge";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Mail } from "lucide-react";



import "@/styles/dashboard/tokens.css";

import "@/styles/dashboard/layout.css";

import "@/styles/dashboard/visual.css";



export default function MailPage() {

  const { t } = useLanguage();



  return (

    <AixiaPage

      surface="command"

      className="aixia-command-page aixia-mail-page h-full flex flex-col overflow-hidden"

    >

      <AixiaHero

        surface="command"

        className="shrink-0"

        gradientTitle={t("mail.title", "Mail")}

        title={t("mail.title", "Mail")}

        subtitle={t(

          "mail.description",

          "Integrated workspace mail is not available yet. We are building it into AiXia—check back soon."

        )}

        actions={

          <Badge variant="secondary" className="shrink-0">

            {t("mail.comingSoon", "Coming soon")}

          </Badge>

        }

      />



      <div className="aixia-command-scroll">

        <Card className="aixia-dash-panel aixia-dash-glass border-border bg-card">

          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">

            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/40">

              <Mail className="h-5 w-5 text-muted-foreground" />

            </div>

            <CardTitle className="text-base font-medium">

              {t("mail.title", "Mail")}

            </CardTitle>

          </CardHeader>

          <CardContent className="text-sm text-muted-foreground">

            {t(

              "mail.description",

              "Integrated workspace mail is not available yet. We are building it into AiXia—check back soon."

            )}

          </CardContent>

        </Card>

      </div>

    </AixiaPage>

  );

}

