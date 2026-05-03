"use client";

import { motion, Variants } from "framer-motion";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionList } from "@/components/transactions/TransactionList";

export default function TransactionsPage() {
  const { 
    transactions, cards, loading, 
    form, tab, setTab, filterType, setFilterType, 
    filteredCategories, handleSubmit, handleDelete 
  } = useTransactions();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
  };

  return (
    <motion.div 
      className="p-6 pb-24"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.header variants={itemVariants} className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Movimientos</h1>
        <p className="text-sm text-gray-500 mt-1">Registrá tus ingresos y gastos.</p>
      </motion.header>

      <div className="flex flex-col gap-8">
        
        <TransactionForm 
          tab={tab}
          setTab={setTab}
          form={form}
          cards={cards}
          filteredCategories={filteredCategories}
          handleSubmit={handleSubmit}
          itemVariants={itemVariants}
        />

        <TransactionList 
          transactions={transactions}
          loading={loading}
          filterType={filterType}
          setFilterType={setFilterType}
          handleDelete={handleDelete}
          itemVariants={itemVariants}
        />

      </div>
    </motion.div>
  );
}