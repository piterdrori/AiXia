export type ExpenseHubTabItem<T extends string = string> = {
  key: T;
  label: string;
  count?: number;
};

type ExpenseHubTabsProps<T extends string> = {
  tabs: ExpenseHubTabItem<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
};

export function ExpenseHubTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
}: ExpenseHubTabsProps<T>) {
  return (
    <div className="aixia-command-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          className={`aixia-command-tab ${
            activeTab === tab.key ? "aixia-command-tab--active" : ""
          }`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {typeof tab.count === "number" ? ` (${tab.count})` : ""}
        </button>
      ))}
    </div>
  );
}
