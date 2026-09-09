'use client';
import { useState } from 'react';
import { Button as AriaButton, Dialog, DialogTrigger, Popover } from 'react-aria-components';
import { RiLogoutBoxRLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { ChevronUpDownSmall } from '@/components/foundations/icons/chevrons';

export function SidebarProfile({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  return <DialogTrigger isOpen={open} onOpenChange={setOpen}>
    <AriaButton aria-label="管理员个人中心" className="flex min-h-9 cursor-pointer items-center gap-2 rounded-2lg px-2 text-body-medium text-text-primary outline-none hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring">
      管理员<ChevronUpDownSmall className="size-4 text-foreground-icon-tertiary"/>
    </AriaButton>
    <Popover placement="bottom start" offset={8} className="z-50 w-56 max-w-[calc(100vw-32px)] rounded-2xl border border-border-button-default bg-background-primary-default p-2.5 shadow-dropdown">
      <Dialog aria-label="个人中心" className="flex flex-col gap-3 outline-none">
        <div className="px-2 py-1 text-body-medium text-text-primary">管理员</div>
        <Button variant="ghost" leadingIcon={RiLogoutBoxRLine} className="justify-start" onClick={() => { setOpen(false); onLogout(); }}>退出演示</Button>
      </Dialog>
    </Popover>
  </DialogTrigger>;
}
