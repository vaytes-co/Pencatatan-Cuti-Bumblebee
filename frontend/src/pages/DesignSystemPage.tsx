import { useState } from 'react'
import {
  Check,
  Mail,
  Plus,
  Search,
  User,
} from 'lucide-react'

import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'

function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f7f8fc] p-6 sm:p-10">

      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <Badge variant="violet">
            Design System
          </Badge>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            UI Components
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Komponen dasar untuk seluruh aplikasi Leave Management.
          </p>
        </div>


        {/* Buttons */}
        <Card className="mb-5">
          <h2 className="mb-4 text-sm font-bold text-slate-900">
            Buttons
          </h2>

          <div className="flex flex-wrap gap-3">
            <Button icon={<Plus size={17} />}>
              Primary
            </Button>

            <Button variant="secondary">
              Secondary
            </Button>

            <Button variant="outline">
              Outline
            </Button>

            <Button variant="danger">
              Danger
            </Button>

            <Button variant="ghost">
              Ghost
            </Button>

            <Button
              loading
            >
              Loading
            </Button>
          </div>
        </Card>


        {/* Inputs */}
        <Card className="mb-5">
          <h2 className="mb-4 text-sm font-bold text-slate-900">
            Inputs
          </h2>

          <div className="grid gap-5 md:grid-cols-2">

            <Input
              id="name"
              label="Nama"
              placeholder="Masukkan nama"
              icon={<User size={17} />}
            />

            <Input
              id="email"
              label="Email"
              placeholder="nama@email.com"
              icon={<Mail size={17} />}
            />

            <Input
              id="search"
              label="Search"
              placeholder="Cari sesuatu..."
              icon={<Search size={17} />}
            />

            <Input
              id="error"
              label="Input dengan error"
              placeholder="Contoh error"
              error="Field ini wajib diisi"
            />

          </div>
        </Card>


        {/* Badges */}
        <Card className="mb-5">
          <h2 className="mb-4 text-sm font-bold text-slate-900">
            Badges
          </h2>

          <div className="flex flex-wrap gap-3">

            <Badge>
              Draft
            </Badge>

            <Badge variant="success">
              Disetujui
            </Badge>

            <Badge variant="warning">
              Menunggu
            </Badge>

            <Badge variant="danger">
              Ditolak
            </Badge>

            <Badge variant="info">
              Informasi
            </Badge>

            <Badge variant="violet">
              Management
            </Badge>

          </div>
        </Card>


        {/* Modal */}
        <Card>
          <h2 className="mb-4 text-sm font-bold text-slate-900">
            Modal
          </h2>

          <Button
            icon={<Check size={17} />}
            onClick={() => setModalOpen(true)}
          >
            Buka Modal
          </Button>
        </Card>

      </div>


      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Contoh Modal"
        description="Modal ini nantinya bisa digunakan untuk berbagai kebutuhan."
      >
        <div className="space-y-4">

          <Input
            label="Nama"
            placeholder="Masukkan nama"
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Batal
            </Button>

            <Button
              onClick={() => setModalOpen(false)}
            >
              Simpan
            </Button>
          </div>

        </div>
      </Modal>

    </div>
  )
}

export default DesignSystemPage