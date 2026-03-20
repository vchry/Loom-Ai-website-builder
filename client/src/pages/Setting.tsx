import {
  AccountSettingsCards,
  ChangePasswordCard,
  DeleteAccountCard,
} from "@daveyplate/better-auth-ui";

const Settings = () => {
  return (
    <div className="w-full p-4 flex justify-center items-center min-h-[90vh] flex-col gap-6 py-12">
      <AccountSettingsCards
        classNames={{
          card: {
            base: "bg-black/10 ring ring-indigo-950 max-w-xl mx-auto",
            footer: "bg-black/10 ring ring-indigo-950",
          },
        }}
      />

      <div className="w-full">
        <ChangePasswordCard
          classNames={{
            base: "bg-black/10 ring ring-indigo-950 max-w-xl mx-auto",
            footer: "bg-black/10 ring ring-indigo-950",
          }}
        />
      </div>

      <div className="w-full">
        <DeleteAccountCard
          classNames={{
            base: "bg-[#0f0b1a] border border-purple-900/40 rounded-xl max-w-xl mx-auto",
            footer:
              "bg-red-900/40 border-t border-red-800/40 flex justify-end px-6 py-4",
            button:
              "bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition",
          }}
        />
      </div>
    </div>
  );
};

export default Settings;