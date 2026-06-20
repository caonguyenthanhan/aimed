"use client"

import { Search } from "lucide-react"
import { HealthLookupResultsPanel } from "@/components/health-lookup/health-lookup-results-panel"
import { HealthLookupSearchPanel } from "@/components/health-lookup/health-lookup-search-panel"
import { useHealthLookupController } from "@/components/health-lookup/use-health-lookup-controller"
import { PageAiInsight } from "@/components/page-ai-insight"

export function HealthLookup() {
  const lookup = useHealthLookupController()

  return (
    <div
      suppressHydrationWarning
      className="h-full overflow-y-auto bg-white dark:bg-slate-950 hero-gradient dark:hero-gradient-dark"
      style={{ WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 dark:bg-blue-950/30 rounded-xl mb-4">
            <Search className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">
            Tra cứu Thông tin Y tế
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400">
            Tìm kiếm thông tin chi tiết về bệnh lý, thuốc men và các vấn đề sức khỏe
          </p>
        </div>

        <PageAiInsight pageContext="health_knowledge" userQuestion={lookup.searchQuery} />

        <HealthLookupSearchPanel
          searchQuery={lookup.searchQuery}
          setSearchQuery={lookup.setSearchQuery}
          isLoading={lookup.isLoading}
          suggestions={lookup.suggestions}
          showSuggestions={lookup.showSuggestions}
          setShowSuggestions={lookup.setShowSuggestions}
          history={lookup.history}
          clearHistory={lookup.clearHistory}
          categoryOpen={lookup.categoryOpen}
          setCategoryOpen={lookup.setCategoryOpen}
          categoryTitle={lookup.categoryTitle}
          categoryItems={lookup.categoryItems}
          getTypeBadgeClass={lookup.getTypeBadgeClass}
          handleSearch={lookup.handleSearch}
          openCategory={lookup.openCategory}
        />

        <HealthLookupResultsPanel
          searchResults={lookup.searchResults}
          getTypeBadgeClass={lookup.getTypeBadgeClass}
          getSeverityColor={lookup.getSeverityColor}
          copyResult={lookup.copyResult}
          shareResult={lookup.shareResult}
          refQuery={lookup.refQuery}
          refLoading={lookup.refLoading}
          refError={lookup.refError}
          refEntities={lookup.refEntities}
          refRelations={lookup.refRelations}
          refInterventions={lookup.refInterventions}
          runRefSearch={lookup.runRefSearch}
        />

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      </div>
    </div>
  )
}
